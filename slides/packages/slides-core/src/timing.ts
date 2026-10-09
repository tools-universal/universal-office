import { childElements, firstChild, type XmlElement } from './xml.js';

/**
 * Modelo de TEMPO de um slide: a transição de entrada (`<p:transition>`,
 * inclusive embrulhada em `mc:AlternateContent`) e a árvore de animação
 * `<p:timing>` (o SMIL do PresentationML), avaliada em PASSOS (cliques) e
 * EFEITOS com início/duração. É a base da reprodução automática
 * (`playback.ts`); o modelo v1 (`Slide.animations`/`Slide.transition`) segue
 * intacto para o modo de navegação manual.
 *
 * Fatos medidos no app de referência (export de vídeo via COM — ver
 * tools/ppt-lab/playback/FINDINGS.md):
 *  - duração da transição: `p14:dur` (ms) vence; senão `spd` fast=500,
 *    med=750, slow=1000 ms (default fast).
 *  - o app grava transições 2010+ (e qualquer duração fora de fast/med/slow)
 *    dentro de `mc:AlternateContent` — Choice `p14`/`p15`/`p159` + Fallback.
 *  - passos do mainSeq: `<p:cond delay="indefinite"/>` = espera clique; o 1º
 *    passo é AUTOMÁTICO quando traz `<p:cond evt="onBegin">` (efeito inicial
 *    "após/com o anterior"). Qualquer OUTRO filho do mainSeq é um passo por
 *    clique — inclusive com `delay` numérico (o app ignora esse atraso).
 *  - dentro do passo, "após o anterior" vira um `par` irmão cujo `delay`
 *    gravado é só um cache: na reprodução o app ENCADEIA dinamicamente (começa
 *    quando o sub-grupo anterior termina de fato).
 *  - texto por letra/palavra (`<p:iterate>`): letras = caracteres SEM espaços;
 *    se a forma-alvo tem FUNDO visível (preenchimento ou contorno), o fundo é
 *    uma unidade inicial de duração cheia: total = base + base + (n−1)·intervalo.
 *    Medido com o oráculo: `<p:bldP animBg>` NÃO muda nada (nem tempo nem
 *    visual) — caixa de texto sem fundo nunca tem a unidade; forma preenchida
 *    (ou só com contorno, ou caixa de texto preenchida) sempre tem.
 */

export interface SlideTransitionInfo {
  /** Elemento do efeito sem prefixo (fade, push, vortex, morph…); 'none' sem efeito. */
  type: string;
  /** Prefixo do elemento do efeito (p, p14, p15, p159). */
  ns: string;
  /** Atributos do elemento do efeito (dir, thruBlk, orient, pattern…). */
  attrs: Record<string, string>;
  /** Duração em ms (`p14:dur` > `spd`). */
  durMs: number;
  /** Avança sozinho após N ms (`advTm`). */
  advTmMs?: number;
  /** Avança no clique (`advClick`, default true). */
  advClick: boolean;
}

/** Alvo de um comportamento (`<p:tgtEl><p:spTgt>`). */
export interface AnimTarget {
  spid: string;
  /** Faixa de parágrafos (`<p:txEl><p:pRg st end>`), inclusiva. */
  pRange?: [number, number];
  /** Faixa de caracteres (`<p:txEl><p:charRg st end>`). */
  charRange?: [number, number];
  /** Sub-alvo (`bg`, `subSp`, `oleChartEl`, `inkTgt`) — informativo. */
  sub?: string;
  /** Parte de GRÁFICO (`<p:graphicEl><a:chart seriesIdx categoryIdx bldStep>`); −3 = fundo, −4 = todos. */
  chart?: { series: number; category: number; step: string };
  /**
   * Parte de SmartArt (`<p:graphicEl><a:dgm id>`): `modelId` da FORMA do
   * desenho (ponto "pres"). Medido no app: o id do nó de dados não anima nada.
   */
  dgm?: string;
}

/** Condição de início (`<p:cond>`): `delayMs = null` ⇒ "indefinite" (espera evento). */
export interface TimeCond {
  delayMs: number | null;
  evt?: string;
  /** Alvo do evento (`<p:tgtEl><p:spTgt spid>` / `<p14:bmkTgt spid bmkName>`). */
  spid?: string;
  /** Marcador de mídia (`onMediaBookmark`). */
  bookmark?: string;
}

/** Nó da árvore de tempo — container (`par/seq/excl`) ou comportamento. */
export interface TimeNode {
  /** par | seq | excl | set | anim | animEffect | animMotion | animRot | animScale | animClr | cmd | audio | video */
  tag: string;
  id?: string;
  st: TimeCond[];
  /** Duração simples em ms (Infinity = indefinite). Ausente = implícita (filhos). */
  dur?: number;
  /** Repetições (`repeatCount` / 1000; Infinity = indefinite). */
  repeat?: number;
  autoRev?: boolean;
  /** `accel`/`decel` como fração 0..1. */
  accel?: number;
  decel?: number;
  fill?: string;
  nodeType?: string;
  presetClass?: string;
  presetId?: number;
  presetSubtype?: number;
  /** Grupo de build (`grpId`) — casa com `<p:bldP spid grpId animBg>`. */
  grpId?: string;
  /** Iteração por elemento/palavra/letra (`<p:iterate>`): `pct` fração da duração simples. */
  iterate?: { type: 'el' | 'wd' | 'lt'; backwards: boolean; pct?: number; absMs?: number };
  target?: AnimTarget;
  attrNames?: string[];
  /** `animEffect`: filtro (fade, wipe(down)…) e sentido (in/out). */
  filter?: string;
  transition?: string;
  /** `set`: valor (`<p:to><p:strVal val>`), ex. visible/hidden. */
  setTo?: string;
  /** `animMotion`: path. */
  path?: string;
  /** `tmFilter` do cTn: mapeamento por partes do progresso [[x,y]…]. */
  tmFilter?: [number, number][];
  /** `spd` do cTn (multiplicador de velocidade). */
  spd?: number;
  /** `<p:cBhvr additive>`: base | sum | repl | mult. */
  additive?: string;
  /** `<p:anim calcmode valueType>`. */
  calcmode?: string;
  valueType?: string;
  /** Quadros-chave de `<p:anim>`: tm 0..1, valor (fórmula/número/texto), fórmula `fmla` com `$`. */
  tav?: { tm: number; val?: string | number; fmla?: string; color?: string }[];
  /** `<p:anim from/to/by>` (fórmulas/números como texto). */
  from?: string;
  to?: string;
  by?: string;
  /** `animScale`/`animMotion`: by/from/to em fração (1 = 100%) ou fração do slide. */
  byXY?: [number, number];
  fromXY?: [number, number];
  toXY?: [number, number];
  /** `animRot`: graus. */
  rotBy?: number;
  rotFrom?: number;
  rotTo?: number;
  /** Cores (`animClr`/`set` clrVal) já resolvidas p/ #RRGGBB; `byHsl` = [h°, s, l] (frações). */
  toColor?: string;
  fromColor?: string;
  byHsl?: [number, number, number];
  clrSpc?: string;
  clrDir?: string;
  /** `animEffect prLst` (ex.: "opacity: 0.5"). */
  prLst?: string;
  /** `animMotion`: rAng (graus), origin, pathEditMode. */
  rAng?: number;
  origin?: string;
  pathEditMode?: string;
  /** Eventos que ENCERRAM o nó (`<p:endCondLst>`), ex.: onNext = "até o próximo clique". */
  endEvts?: string[];
  /** `<p:cmd type cmd>`: comando de mídia/verbo (playFrom(0.0), togglePause…). */
  cmd?: string;
  cmdType?: string;
  /** `<p:video|audio><p:cMediaNode vol mute showWhenStopped numSld>`. */
  media?: { vol?: number; mute?: boolean; showWhenStopped?: boolean; numSld?: number; fullScrn?: boolean };
  children: TimeNode[];
}

/** Efeito (nó com `presetClass`) posicionado no tempo do PASSO. */
export interface EffectTiming {
  id?: string;
  /** entr | exit | emph | path | verb | mediacall */
  presetClass: string;
  presetId: number;
  presetSubtype: number;
  nodeType?: string;
  /** Primeiro alvo encontrado nos comportamentos do efeito. */
  target?: AnimTarget;
  /** Início relativo ao início do passo (ms). */
  startMs: number;
  /** Duração ativa (ms; Infinity = repetir até o fim do slide). */
  durMs: number;
  /**
   * Duração que BLOQUEIA a sequência ("após o anterior", fim do passo): igual
   * a `durMs` quando finita; num efeito indefinido, só o espalhamento das
   * unidades de texto ((n−1)·intervalo) — medido no app ("revelar negrito").
   */
  blockMs: number;
  /** `fill` do efeito (`remove` = retroceder ao terminar). */
  fill?: string;
  /** Filtro do 1º `animEffect` (fade, wipe(down)…). */
  filter?: string;
  /** O efeito usa `animMotion` (trajetória). */
  motion?: boolean;
  /** Termina no PRÓXIMO CLIQUE (`<p:endCondLst><p:cond evt="onNext">`), ex.: repetir até o clique. */
  endOnNext?: boolean;
  node: TimeNode;
}

/** Passo da sequência principal (um "clique"). */
export interface AnimStep {
  /** Passo automático (o 1º, quando começa com efeito após/com o anterior). */
  auto: boolean;
  /** Fim do último efeito FINITO do passo (ms). */
  durMs: number;
  /** Algum efeito do passo é indefinido (repetir até o fim do slide). */
  hasIndefinite: boolean;
  effects: EffectTiming[];
}

export interface SlideTimingModel {
  transition?: SlideTransitionInfo;
  /** Passos da sequência principal (mainSeq), em ordem. */
  steps: AnimStep[];
  /** Efeitos de sequências interativas (gatilho = clique em forma) — não tocam sozinhos. */
  interactive: EffectTiming[];
  /** `<p:sld show="0">`: oculto na apresentação. */
  hidden: boolean;
  /** spids cujo FUNDO é a 1ª unidade dos efeitos por letra/palavra (formas com fundo visível). */
  animBg?: string[];
  /** Nós de mídia (`<p:video>`/`<p:audio>`): volume, mudo, "ocultar quando parado". */
  media?: SlideMediaInfo[];
  /**
   * Sequências disparadas por MARCADOR de mídia (`onMediaBookmark`): tocam
   * sozinhas quando a mídia passa pelo marcador. `timeMs` (posição do
   * marcador no arquivo) é resolvido por quem conhece as formas (read.ts).
   */
  bookmarkTriggers?: BookmarkTrigger[];
}

/** Efeitos disparados quando a mídia `spid` passa pelo marcador `bookmark`. */
export interface BookmarkTrigger {
  spid: string;
  bookmark: string;
  /** Posição do marcador no arquivo de mídia (ms). */
  timeMs?: number;
  /** Início do corte da mídia (`p14:trim st`), ms — o marcador conta do arquivo. */
  trimStartMs?: number;
  effects: EffectTiming[];
}

/** Opções de reprodução de uma mídia do slide (`<p:cMediaNode>`). */
export interface SlideMediaInfo {
  spid: string;
  kind: 'video' | 'audio';
  /** Volume 0..1 (`vol` / 100000; default do app 0.8). */
  vol?: number;
  mute?: boolean;
  /** false = "ocultar enquanto não estiver tocando". */
  showWhenStopped?: boolean;
  /** "Retroceder após a reprodução" (`fill="remove"` no nó): volta à capa ao terminar. */
  rewind?: boolean;
  /** "Repetir até parar" (`repeatCount="indefinite"` no nó). */
  loop?: boolean;
  /** "Reproduzir em tela cheia" (`<p:video fullScrn="1">`). */
  fullScreen?: boolean;
}

/** Conta unidades de texto (palavras/letras) do alvo — para `<p:iterate>`. */
export type CountTextUnits = (target: AnimTarget | undefined, type: 'el' | 'wd' | 'lt') => number;

/** Contexto de avaliação de durações: contagem de texto + fundo animado (bldLst). */
export interface TimingEvalCtx {
  units: CountTextUnits;
  /** O fundo da forma é a 1ª unidade de um efeito por letra/palavra. */
  animBg?: (spid: string, grpId: string | undefined) => boolean;
}

/** A forma tem fundo visível (preenchimento/contorno)? — decide a unidade de fundo. */
export type HasBackground = (spid: string) => boolean;

// ───────────────────────── transição ─────────────────────────

/** Desembrulha `mc:AlternateContent`: 1º `mc:Choice` (lemos p14/p15/p159), senão `mc:Fallback`. */
function unwrapAlternate(root: XmlElement, name: string): XmlElement | undefined {
  const direct = firstChild(root, name);
  if (direct) return direct;
  for (const ac of childElements(root, 'mc:AlternateContent')) {
    for (const branch of childElements(ac)) {
      if (branch.name !== 'mc:Choice' && branch.name !== 'mc:Fallback') continue;
      const el = firstChild(branch, name);
      if (el) return el;
    }
  }
  return undefined;
}

const SPEED_MS: Record<string, number> = { fast: 500, med: 750, slow: 1000 };

/** Lê a transição de entrada de um `<p:sld>` (direta ou em AlternateContent). */
export function parseSlideTransition(sld: XmlElement): SlideTransitionInfo | undefined {
  const el = unwrapAlternate(sld, 'p:transition');
  if (!el) return undefined;
  let durMs = SPEED_MS[el.attrs['spd'] ?? 'fast'] ?? 500;
  const p14dur = el.attrs['p14:dur'];
  if (p14dur !== undefined && /^\d+$/.test(p14dur)) durMs = parseInt(p14dur, 10);
  const fx = childElements(el).find((c) => !c.name.endsWith(':sndAc') && c.name !== 'p:extLst');
  const info: SlideTransitionInfo = {
    type: fx ? fx.name.slice(fx.name.indexOf(':') + 1) : 'none',
    ns: fx ? fx.name.slice(0, fx.name.indexOf(':')) : '',
    attrs: fx ? { ...fx.attrs } : {},
    durMs,
    advClick: el.attrs['advClick'] !== '0' && el.attrs['advClick'] !== 'false',
  };
  const adv = el.attrs['advTm'];
  if (adv !== undefined && /^\d+$/.test(adv)) info.advTmMs = parseInt(adv, 10);
  return info;
}

// ───────────────────────── árvore de tempo ─────────────────────────

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  if (v === 'indefinite') return Infinity;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseConds(lst: XmlElement | undefined): TimeCond[] {
  if (!lst) return [];
  return childElements(lst, 'p:cond').map((c) => {
    const d = c.attrs['delay'];
    const cond: TimeCond = { delayMs: d === undefined ? 0 : d === 'indefinite' ? null : (parseFloat(d) || 0) };
    if (c.attrs['evt']) cond.evt = c.attrs['evt'];
    const tgt = firstChild(c, 'p:tgtEl');
    if (tgt) for (const t of childElements(tgt)) {
      if (t.attrs['spid']) cond.spid = t.attrs['spid'];
      if (t.attrs['bmkName'] !== undefined) cond.bookmark = t.attrs['bmkName'];
    }
    return cond;
  });
}

function parseCTn(tag: string, cTn: XmlElement): TimeNode {
  const a = cTn.attrs;
  const node: TimeNode = { tag, st: parseConds(firstChild(cTn, 'p:stCondLst')), children: [] };
  if (a['id']) node.id = a['id'];
  const dur = num(a['dur']);
  if (dur !== undefined) node.dur = dur;
  const rc = num(a['repeatCount']);
  // contagens absurdas (FLT_MAX vindo de binário) também são "indefinido"
  if (rc !== undefined) node.repeat = rc === Infinity || rc >= 1e12 ? Infinity : rc / 1000;
  const ends = parseConds(firstChild(cTn, 'p:endCondLst')).map((c) => c.evt).filter((e): e is string => !!e);
  if (ends.length) node.endEvts = ends;
  if (a['autoRev'] === '1' || a['autoRev'] === 'true') node.autoRev = true;
  const accel = num(a['accel']); if (accel) node.accel = accel / 100000;
  const decel = num(a['decel']); if (decel) node.decel = decel / 100000;
  if (a['fill']) node.fill = a['fill'];
  if (a['nodeType']) node.nodeType = a['nodeType'];
  if (a['presetClass']) node.presetClass = a['presetClass'];
  const pid = num(a['presetID']); if (pid !== undefined) node.presetId = pid;
  const pst = num(a['presetSubtype']); if (pst !== undefined) node.presetSubtype = pst;
  if (a['grpId'] !== undefined) node.grpId = a['grpId'];
  const spd = num(a['spd']); if (spd !== undefined && spd > 0) node.spd = spd / 100000;
  if (a['tmFilter']) {
    const pts = a['tmFilter'].split(';').map((pair) => pair.split(',').map((v) => parseFloat(v)))
      .filter((xy): xy is [number, number] => xy.length === 2 && Number.isFinite(xy[0]) && Number.isFinite(xy[1]));
    if (pts.length >= 2) node.tmFilter = pts;
  }
  const it = firstChild(cTn, 'p:iterate');
  if (it) {
    const type = (it.attrs['type'] ?? 'el') as 'el' | 'wd' | 'lt';
    const iter: TimeNode['iterate'] = { type, backwards: it.attrs['backwards'] === '1' || it.attrs['backwards'] === 'true' };
    const pct = firstChild(it, 'p:tmPct');
    const abs = firstChild(it, 'p:tmAbs');
    if (pct?.attrs['val'] !== undefined) iter.pct = parseFloat(pct.attrs['val']) / 100000;
    if (abs?.attrs['val'] !== undefined) iter.absMs = parseFloat(abs.attrs['val']);
    node.iterate = iter;
  }
  return node;
}

function parseTarget(tgtEl: XmlElement | undefined): AnimTarget | undefined {
  if (!tgtEl) return undefined;
  // tinta: <p:inkTgt spid> é IRMÃO de <p:spTgt> no <p:tgtEl> (schema), não filho
  const ink = firstChild(tgtEl, 'p:inkTgt');
  if (ink?.attrs['spid']) return { spid: ink.attrs['spid'], sub: 'inkTgt' };
  const sp = firstChild(tgtEl, 'p:spTgt');
  if (!sp?.attrs['spid']) return undefined;
  const t: AnimTarget = { spid: sp.attrs['spid'] };
  const txEl = firstChild(sp, 'p:txEl');
  if (txEl) {
    const pRg = firstChild(txEl, 'p:pRg');
    const cRg = firstChild(txEl, 'p:charRg');
    if (pRg) t.pRange = [parseInt(pRg.attrs['st'] ?? '0', 10), parseInt(pRg.attrs['end'] ?? '0', 10)];
    if (cRg) t.charRange = [parseInt(cRg.attrs['st'] ?? '0', 10), parseInt(cRg.attrs['end'] ?? '0', 10)];
  }
  for (const k of ['p:bg', 'p:subSp', 'p:oleChartEl', 'p:graphicEl']) {
    if (firstChild(sp, k)) t.sub = k.slice(2);
  }
  const ge = firstChild(sp, 'p:graphicEl');
  if (ge) {
    const ch = firstChild(ge, 'a:chart');
    const dg = firstChild(ge, 'a:dgm');
    if (ch) t.chart = { series: parseInt(ch.attrs['seriesIdx'] ?? '-1', 10), category: parseInt(ch.attrs['categoryIdx'] ?? '-1', 10), step: ch.attrs['bldStep'] ?? 'allPts' };
    if (dg?.attrs['id']) t.dgm = dg.attrs['id'];
  }
  return t;
}

const BEHAVIORS = new Set(['set', 'anim', 'animEffect', 'animMotion', 'animRot', 'animScale', 'animClr', 'cmd']);

/** Resolve um elemento de cor DrawingML (`a:srgbClr`, `a:schemeClr`…) p/ #RRGGBB. */
export type ResolveColor = (el: XmlElement) => string | undefined;

/** Primeiro filho de cor (`a:*Clr`) de um elemento. */
function colorChild(el: XmlElement | undefined): XmlElement | undefined {
  if (!el) return undefined;
  return childElements(el).find((c) => /^a:(srgbClr|schemeClr|sysClr|prstClr|scrgbClr|hslClr)$/.test(c.name));
}

/** `x`/`y` (×1000 % ou EMU-fração) de `<p:by x y>` etc. */
function readXY(el: XmlElement | undefined, div: number): [number, number] | undefined {
  if (!el) return undefined;
  const x = num(el.attrs['x']), y = num(el.attrs['y']);
  if (x === undefined && y === undefined) return undefined;
  return [(x ?? 0) / div, (y ?? 0) / div];
}

/** Valor de `<p:val>`/`<p:to>` (strVal | fltVal | intVal | boolVal | clrVal). */
function readVal(el: XmlElement | undefined, color?: ResolveColor): { val?: string | number; color?: string } {
  if (!el) return {};
  for (const c of childElements(el)) {
    if (c.name === 'p:strVal') return { val: c.attrs['val'] ?? '' };
    if (c.name === 'p:fltVal' || c.name === 'p:intVal') return { val: parseFloat(c.attrs['val'] ?? '0') };
    if (c.name === 'p:boolVal') return { val: c.attrs['val'] === '1' || c.attrs['val'] === 'true' ? 1 : 0 };
    if (c.name === 'p:clrVal') {
      const ce = colorChild(c);
      const hex = ce && color ? color(ce) : undefined;
      return hex ? { color: hex } : {};
    }
  }
  return {};
}

/** Converte um elemento da árvore (`p:par`, `p:seq`, comportamento…) em `TimeNode`. */
export function parseTimeNode(el: XmlElement, color?: ResolveColor): TimeNode | null {
  const tag = el.name.slice(el.name.indexOf(':') + 1);
  if (tag === 'par' || tag === 'seq' || tag === 'excl') {
    const cTn = firstChild(el, 'p:cTn');
    if (!cTn) return null;
    const node = parseCTn(tag, cTn);
    const lst = firstChild(cTn, 'p:childTnLst');
    if (lst) for (const c of childElements(lst)) {
      const n = parseTimeNode(c, color);
      if (n) node.children.push(n);
    }
    return node;
  }
  if (BEHAVIORS.has(tag)) {
    const cBhvr = firstChild(el, 'p:cBhvr');
    const cTn = cBhvr ? firstChild(cBhvr, 'p:cTn') : undefined;
    if (!cBhvr || !cTn) return null;
    const node = parseCTn(tag, cTn);
    const t = parseTarget(firstChild(cBhvr, 'p:tgtEl'));
    if (t) node.target = t;
    const names = firstChild(cBhvr, 'p:attrNameLst');
    if (names) node.attrNames = childElements(names, 'p:attrName').map((n) => n.children.filter((c) => typeof c === 'string').join(''));
    if (cBhvr.attrs['additive']) node.additive = cBhvr.attrs['additive'];
    const a = el.attrs;
    if (tag === 'animEffect') {
      if (a['filter']) node.filter = a['filter'];
      if (a['transition']) node.transition = a['transition'];
      if (a['prLst']) node.prLst = a['prLst'];
    } else if (tag === 'set') {
      const v = readVal(firstChild(el, 'p:to'), color);
      if (typeof v.val === 'string') node.setTo = v.val;
      else if (typeof v.val === 'number') node.setTo = String(v.val);
      if (v.color) node.toColor = v.color;
    } else if (tag === 'anim') {
      if (a['calcmode']) node.calcmode = a['calcmode'];
      if (a['valueType']) node.valueType = a['valueType'];
      if (a['from'] !== undefined) node.from = a['from'];
      if (a['to'] !== undefined) node.to = a['to'];
      if (a['by'] !== undefined) node.by = a['by'];
      const lst = firstChild(el, 'p:tavLst');
      if (lst) {
        node.tav = childElements(lst, 'p:tav').map((t) => {
          const v = readVal(firstChild(t, 'p:val'), color);
          const k: NonNullable<TimeNode['tav']>[number] = { tm: t.attrs['tm'] !== undefined ? parseFloat(t.attrs['tm']) / 100000 : NaN };
          if (v.val !== undefined) k.val = v.val;
          if (v.color) k.color = v.color;
          if (t.attrs['fmla']) k.fmla = t.attrs['fmla'];
          return k;
        });
        // tm ausente: distribui uniformemente (SMIL keyTimes implícitos)
        const n = node.tav.length;
        node.tav.forEach((k, i) => { if (!Number.isFinite(k.tm)) k.tm = n > 1 ? i / (n - 1) : 0; });
      }
    } else if (tag === 'animScale') {
      const by = readXY(firstChild(el, 'p:by'), 100000);
      const from = readXY(firstChild(el, 'p:from'), 100000);
      const to = readXY(firstChild(el, 'p:to'), 100000);
      if (by) node.byXY = by;
      if (from) node.fromXY = from;
      if (to) node.toXY = to;
    } else if (tag === 'animRot') {
      const by = num(a['by']), from = num(a['from']), to = num(a['to']);
      if (by !== undefined) node.rotBy = by / 60000;
      if (from !== undefined) node.rotFrom = from / 60000;
      if (to !== undefined) node.rotTo = to / 60000;
    } else if (tag === 'animMotion') {
      if (a['path']) node.path = a['path'];
      if (a['origin']) node.origin = a['origin'];
      if (a['pathEditMode']) node.pathEditMode = a['pathEditMode'];
      const r = num(a['rAng']); if (r !== undefined) node.rAng = r / 60000;
      const by = readXY(firstChild(el, 'p:by'), 100000);
      const from = readXY(firstChild(el, 'p:from'), 100000);
      const to = readXY(firstChild(el, 'p:to'), 100000);
      if (by) node.byXY = by;
      if (from) node.fromXY = from;
      if (to) node.toXY = to;
    } else if (tag === 'cmd') {
      if (a['cmd'] !== undefined) node.cmd = a['cmd'];
      if (a['type']) node.cmdType = a['type'];
    } else if (tag === 'animClr') {
      if (a['clrSpc']) node.clrSpc = a['clrSpc'];
      if (a['dir']) node.clrDir = a['dir'];
      const toEl = colorChild(firstChild(el, 'p:to'));
      const fromEl = colorChild(firstChild(el, 'p:from'));
      if (toEl && color) { const c = color(toEl); if (c) node.toColor = c; }
      if (fromEl && color) { const c = color(fromEl); if (c) node.fromColor = c; }
      const byEl = firstChild(el, 'p:by');
      const hsl = byEl ? firstChild(byEl, 'p:hsl') : undefined;
      if (hsl) node.byHsl = [(num(hsl.attrs['h']) ?? 0) / 60000, (num(hsl.attrs['s']) ?? 0) / 100000, (num(hsl.attrs['l']) ?? 0) / 100000];
    }
    return node;
  }
  if (tag === 'audio' || tag === 'video') {
    const media = firstChild(el, 'p:cMediaNode');
    const cTn = media ? firstChild(media, 'p:cTn') : undefined;
    if (!media || !cTn) return null;
    const node = parseCTn(tag, cTn);
    const t = parseTarget(firstChild(media, 'p:tgtEl'));
    if (t) node.target = t;
    const m = media.attrs, info: NonNullable<TimeNode['media']> = {};
    if (m['vol'] !== undefined) info.vol = parseInt(m['vol'], 10) / 100000;
    if (m['mute'] !== undefined) info.mute = m['mute'] === '1' || m['mute'] === 'true';
    if (m['showWhenStopped'] !== undefined) info.showWhenStopped = !(m['showWhenStopped'] === '0' || m['showWhenStopped'] === 'false');
    if (m['numSld'] !== undefined) info.numSld = parseInt(m['numSld'], 10);
    if (tag === 'video' && el.attrs['fullScrn'] !== undefined) info.fullScrn = el.attrs['fullScrn'] === '1' || el.attrs['fullScrn'] === 'true';
    node.media = info;
    return node;
  }
  return null;
}

// ───────────────────────── avaliação ─────────────────────────

/** Deslocamento de início de um filho num `par` (ms) — `null` = só por evento/clique. */
export function beginOffset(n: TimeNode): number | null {
  if (n.st.length === 0) return 0;
  for (const c of n.st) {
    if (c.delayMs === null) continue;
    if (!c.evt || c.evt === 'onBegin') return c.delayMs;
  }
  return null;
}

/**
 * Início de passo AINDA NÃO DISPARADO (apresentação por clique, gatilhos
 * interativos): longe o bastante para nunca chegar — o efeito fica no estado
 * inicial (entrada oculta) e não toca nem no "fim do slide" (animMs = ∞).
 * Passos pendentes ficam em ordem (`+ passo · 1e7`).
 */
export const STEP_PENDING = 1e12;

/** Alvo é a forma inteira (sem `<p:txEl>`/`<p:bg>`/sub-alvo)? */
function wholeShape(t: AnimTarget): boolean {
  return !t.pRange && !t.charRange && !t.sub;
}

function firstTarget(n: TimeNode): AnimTarget | undefined {
  if (n.target) return n.target;
  for (const c of n.children) {
    const t = firstTarget(c);
    if (t) return t;
  }
  return undefined;
}

/** Duração SIMPLES do nó (uma iteração, sem repetição). */
export function simpleDur(n: TimeNode, ctx: TimingEvalCtx): number {
  let base: number;
  if (n.dur !== undefined) base = n.dur;
  else if (n.tag === 'seq') {
    base = 0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) break; // passos por clique: a duração implícita para aqui
      base += b + activeDur(c, ctx);
    }
  } else {
    base = 0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) continue;
      base = Math.max(base, b + activeDur(c, ctx));
    }
  }
  if (n.iterate && Number.isFinite(base)) {
    const tgt = firstTarget(n);
    const count = Math.max(1, ctx.units(tgt, n.iterate.type));
    const gap = n.iterate.absMs ?? (n.iterate.pct ?? 0) * base;
    // fundo da forma: 1ª unidade de duração cheia, antes do texto (só com a
    // forma inteira como alvo — faixa de parágrafos/caracteres não leva o fundo)
    const bg = tgt && wholeShape(tgt) && ctx.animBg?.(tgt.spid, n.grpId) ? base : 0;
    base += bg + (count - 1) * gap;
  }
  return base;
}

/**
 * Duração que bloqueia a sequência: como `activeDur`, mas trechos
 * indefinidos valem 0 (o espalhamento de `<p:iterate>` continua contando).
 */
export function blockDur(n: TimeNode, ctx: TimingEvalCtx): number {
  const d = activeDur(n, ctx);
  if (Number.isFinite(d)) return d;
  if (n.repeat === Infinity) return 0; // "repetir até o fim do slide" não segura a sequência
  let base = 0;
  for (const c of n.children) {
    const b = beginOffset(c);
    if (b === null) continue;
    base = Math.max(base, b + blockDur(c, ctx));
  }
  if (n.iterate) {
    const tgt = firstTarget(n);
    const count = Math.max(1, ctx.units(tgt, n.iterate.type));
    const gap = n.iterate.absMs ?? 0; // % de duração indefinida não tem espalhamento finito
    base += (count - 1) * gap;
  }
  return base;
}

/**
 * Duração ATIVA: simples × (2 com autoRev) × repetições. `spd` NÃO entra:
 * medido no oráculo (pb-tempo-2, "Velocidade 2x") o app acelera o visual (o
 * motor divide o tempo local), mas a sequência e o slide seguem a duração
 * gravada — dividir aqui encurtava o slide em ~1 s.
 */
export function activeDur(n: TimeNode, ctx: TimingEvalCtx): number {
  let d = simpleDur(n, ctx) * (n.autoRev ? 2 : 1);
  if (n.repeat !== undefined) d = n.repeat === Infinity ? Infinity : d * n.repeat;
  return d;
}

function firstOf(n: TimeNode, tag: string): TimeNode | undefined {
  if (n.tag === tag) return n;
  for (const c of n.children) {
    const f = firstOf(c, tag);
    if (f) return f;
  }
  return undefined;
}

/** Coleta os efeitos (nós com presetClass) sob `n`, com início relativo a `t0`. */
function collectEffects(n: TimeNode, t0: number, ctx: TimingEvalCtx, out: EffectTiming[]): void {
  if (n.presetClass) {
    const fx: EffectTiming = {
      presetClass: n.presetClass,
      presetId: n.presetId ?? 0,
      presetSubtype: n.presetSubtype ?? 0,
      startMs: t0,
      durMs: activeDur(n, ctx),
      blockMs: blockDur(n, ctx),
      node: n,
    };
    if (n.id) fx.id = n.id;
    if (n.nodeType) fx.nodeType = n.nodeType;
    if (n.fill) fx.fill = n.fill;
    const t = firstTarget(n);
    if (t) fx.target = t;
    const ae = firstOf(n, 'animEffect');
    if (ae?.filter) fx.filter = ae.filter;
    if (firstOf(n, 'animMotion')) fx.motion = true;
    if (n.endEvts?.includes('onNext')) fx.endOnNext = true;
    out.push(fx);
    return;
  }
  if (n.tag === 'seq') {
    let t = t0;
    for (const c of n.children) {
      const b = beginOffset(c);
      if (b === null) break;
      t += b;
      collectEffects(c, t, ctx, out);
      t += activeDur(c, ctx);
    }
    return;
  }
  for (const c of n.children) {
    const b = beginOffset(c);
    if (b === null) continue;
    collectEffects(c, t0 + b, ctx, out);
  }
}

/** nodeType do 1º efeito sob `n` (clickEffect/withEffect/afterEffect). */
function firstNodeType(n: TimeNode): string | undefined {
  if (n.presetClass) return n.nodeType;
  for (const c of n.children) {
    const t = firstNodeType(c);
    if (t) return t;
  }
  return undefined;
}

/**
 * Atraso de cada elo "após o anterior" (ms): o app dispara o seguinte no ms
 * DEPOIS do fim do anterior. Medido pela fase do esmaecer (`slide-phase.py`):
 * só os slides cujo fim cai logo antes de um tick (3001 ms, 6500 ms com 5–12
 * elos) duram 1 quadro a mais no export.
 */
export const AFTER_LINK_MS = 1;

/**
 * Efeitos de um grupo de clique: sub-grupos "após o anterior" começam quando
 * o sub-grupo anterior TERMINA (encadeamento dinâmico do app), não no `delay`
 * gravado; os demais usam o próprio `delay`. Devolve o fim do grupo.
 */
function collectGroup(group: TimeNode, t0: number, ctx: TimingEvalCtx, out: EffectTiming[]): number {
  let prevEnd = t0;
  let end = t0;
  group.children.forEach((sub, i) => {
    const b = beginOffset(sub);
    if (b === null) return;
    const start = i > 0 && firstNodeType(sub) === 'afterEffect' ? prevEnd + AFTER_LINK_MS : t0 + b;
    collectEffects(sub, start, ctx, out);
    prevEnd = start + blockDur(sub, ctx);
    end = Math.max(end, prevEnd);
  });
  return end;
}

function stepFrom(nodes: { node: TimeNode; offset: number }[], auto: boolean, ctx: TimingEvalCtx): AnimStep {
  const effects: EffectTiming[] = [];
  let t = 0;
  for (const { node, offset } of nodes) {
    t += offset;
    t = node.presetClass ? (collectEffects(node, t, ctx, effects), t + activeDur(node, ctx)) : collectGroup(node, t, ctx, effects);
  }
  let dur = 0;
  let hasIndefinite = false;
  for (const e of effects) {
    dur = Math.max(dur, e.startMs + e.blockMs);
    if (!Number.isFinite(e.durMs)) hasIndefinite = true;
  }
  return { auto, durMs: dur, hasIndefinite, effects };
}

/**
 * Lê o modelo de tempo de um `<p:sld>`: transição + passos do mainSeq +
 * efeitos interativos. `units` conta palavras/letras dos alvos (iterate);
 * `hasBackground` diz se a forma tem fundo visível (unidade de fundo dos
 * efeitos por letra/palavra) — sem ele, cai no `<p:bldP animBg>` do arquivo.
 */
export function parseSlideTiming(sld: XmlElement, units: CountTextUnits, color?: ResolveColor, hasBackground?: HasBackground): SlideTimingModel {
  const show = sld.attrs['show'];
  const model: SlideTimingModel = { steps: [], interactive: [], hidden: show === '0' || show === 'false' };
  const tr = parseSlideTransition(sld);
  if (tr) model.transition = tr;
  const timing = unwrapAlternate(sld, 'p:timing');
  const tnLst = timing ? firstChild(timing, 'p:tnLst') : undefined;
  const rootEl = tnLst ? childElements(tnLst)[0] : undefined;
  const root = rootEl ? parseTimeNode(rootEl, color) : null;
  if (!root) return model;
  // formas que animam o FUNDO junto com o texto (bldLst)
  const bgSet = new Set<string>();
  const bldLst = timing ? firstChild(timing, 'p:bldLst') : undefined;
  if (bldLst) for (const b of childElements(bldLst, 'p:bldP')) {
    if (b.attrs['animBg'] === '1' || b.attrs['animBg'] === 'true') bgSet.add(`${b.attrs['spid']}|${b.attrs['grpId'] ?? '0'}`);
  }
  const ctx: TimingEvalCtx = {
    units,
    animBg: hasBackground ? (spid) => hasBackground(spid) : (spid, grpId) => bgSet.has(`${spid}|${grpId ?? '0'}`),
  };
  // formas cujo fundo vira unidade: alvos inteiros de efeitos por letra/palavra
  const bgIds = new Set<string>();
  const findIter = (n: TimeNode): void => {
    if (n.iterate && (n.iterate.type === 'wd' || n.iterate.type === 'lt')) {
      const t = firstTarget(n);
      if (t && wholeShape(t) && ctx.animBg!(t.spid, n.grpId)) bgIds.add(t.spid);
    }
    for (const c of n.children) findIter(c);
  };
  findIter(root);
  if (bgIds.size) model.animBg = [...bgIds];
  // nós de mídia (fora do mainSeq): volume/mudo/ocultar quando parado
  const media: SlideMediaInfo[] = [];
  const findMedia = (n: TimeNode): void => {
    if ((n.tag === 'video' || n.tag === 'audio') && n.target) {
      const m: SlideMediaInfo = { spid: n.target.spid, kind: n.tag };
      if (n.media?.vol !== undefined) m.vol = n.media.vol;
      if (n.media?.mute !== undefined) m.mute = n.media.mute;
      if (n.media?.showWhenStopped !== undefined) m.showWhenStopped = n.media.showWhenStopped;
      if (n.fill === 'remove') m.rewind = true;
      if (n.repeat === Infinity) m.loop = true;
      if (n.media?.fullScrn) m.fullScreen = true;
      media.push(m);
    }
    for (const c of n.children) findMedia(c);
  };
  findMedia(root);
  if (media.length) model.media = media;

  const seqs: TimeNode[] = [];
  const findSeqs = (n: TimeNode): void => {
    if (n.tag === 'seq') { seqs.push(n); return; }
    for (const c of n.children) findSeqs(c);
  };
  findSeqs(root);

  for (const seq of seqs) {
    if (seq.nodeType === 'mainSeq') {
      // passos: [1º automático (onBegin)] + um passo por filho clicável
      let cur: { node: TimeNode; offset: number }[] = [];
      let curAuto = true;
      const flush = (): void => {
        if (cur.length) model.steps.push(stepFrom(cur, curAuto, ctx));
        cur = [];
      };
      seq.children.forEach((c, i) => {
        // automático só o 1º passo com onBegin; o resto é clique (o app
        // ignora delay numérico em filho do mainSeq — medido no showcase)
        const auto = i === 0 && c.st.some((k) => k.evt === 'onBegin');
        if (!auto) { flush(); curAuto = false; }
        cur.push({ node: c, offset: auto ? (beginOffset(c) ?? 0) : 0 });
        if (!auto) flush();
      });
      flush();
    } else if (seq.nodeType === 'interactiveSeq') {
      const bmk = seq.st.find((c) => c.evt === 'onMediaBookmark' && c.spid && c.bookmark !== undefined);
      if (bmk) {
        // marcador de mídia: dispara sozinho quando a mídia passa pelo ponto —
        // uma sequência interativa avança UM grupo de clique por evento: só o
        // 1º toca na passagem; os demais ficam pendentes (o estado inicial vale)
        const effects: EffectTiming[] = [];
        seq.children.forEach((c, i) => collectGroup({ ...c, st: [] }, 0, ctx, i === 0 ? effects : model.interactive));
        (model.bookmarkTriggers ??= []).push({ spid: bmk.spid!, bookmark: bmk.bookmark!, effects });
      } else {
        for (const c of seq.children) collectGroup({ ...c, st: [] }, 0, ctx, model.interactive);
      }
    }
  }
  return model;
}

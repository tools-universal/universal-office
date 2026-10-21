import type {
  DocFormatting, StyleDef, RPr, PPr, TblPr, TrPr, TcPr, RFonts, TabSpec, TblStylePart, TblStyleType,
  BorderSpec, CellMargins, TcBorders, Theme,
} from '@universal-office/docx-core';

/**
 * Cascata de propriedades do Word (ECMA-376 §17.7.2):
 *   parágrafo: docDefaults → estilo de tabela (+condicionais) → estilo de
 *              parágrafo (cadeia basedOn) → nível de numeração → direto
 *   run:       docDefaults → estilo de tabela → estilo de parágrafo → estilo
 *              de caractere → direto
 * Propriedades ALTERNÁVEIS (b, i, caps…) entre TIPOS de estilo combinam por
 * XOR (§17.7.3); a formatação direta é absoluta.
 */

export const TOGGLES = ['b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 'strike', 'dstrike', 'outline', 'shadow', 'emboss', 'imprint', 'vanish'] as const;
type ToggleKey = typeof TOGGLES[number];

// ───────────────────────── merges ─────────────────────────

/** rFonts: cada SLOT (ascii/hAnsi/eastAsia/cs) é um par nome|tema; o nível
 *  de cima que define qualquer dos dois substitui o slot inteiro. */
export function mergeRFonts(base: RFonts | undefined, over: RFonts | undefined): RFonts | undefined {
  if (!over) return base;
  if (!base) return { ...over };
  const out: RFonts = { ...base };
  const slot = (name: 'ascii' | 'hAnsi' | 'eastAsia' | 'cs', theme: 'asciiTheme' | 'hAnsiTheme' | 'eastAsiaTheme' | 'cstheme') => {
    if (over[name] !== undefined || over[theme] !== undefined) {
      delete out[name];
      delete out[theme];
      if (over[name] !== undefined) out[name] = over[name];
      if (over[theme] !== undefined) out[theme] = over[theme];
    }
  };
  slot('ascii', 'asciiTheme');
  slot('hAnsi', 'hAnsiTheme');
  slot('eastAsia', 'eastAsiaTheme');
  slot('cs', 'cstheme');
  if (over.hint !== undefined) out.hint = over.hint;
  return out;
}

export function mergeRPr(base: RPr | undefined, over: RPr | undefined): RPr {
  if (!over) return { ...(base ?? {}) };
  if (!base) return { ...over };
  const out: RPr = { ...base, ...over };
  const f = mergeRFonts(base.rFonts, over.rFonts);
  if (f) out.rFonts = f;
  if (base.lang && over.lang) out.lang = { ...base.lang, ...over.lang };
  return out;
}

function mergeTabs(base: TabSpec[] | undefined, over: TabSpec[] | undefined): TabSpec[] | undefined {
  if (!over) return base;
  const map = new Map<number, TabSpec>();
  for (const t of base ?? []) map.set(t.pos, t);
  for (const t of over) {
    if (t.val === 'clear') map.delete(t.pos);
    else map.set(t.pos, t);
  }
  return [...map.values()].sort((a, b) => a.pos - b.pos);
}

export function mergePPr(base: PPr | undefined, over: PPr | undefined): PPr {
  if (!over) return { ...(base ?? {}) };
  if (!base) return { ...over, ...(over.tabs ? { tabs: over.tabs.filter((t) => t.val !== 'clear') } : {}) };
  const out: PPr = { ...base, ...over };
  if (base.spacing || over.spacing) out.spacing = { ...base.spacing, ...over.spacing };
  if (base.ind || over.ind) {
    const ind = { ...base.ind, ...over.ind };
    // firstLine × hanging são o mesmo "slot"
    if (over.ind?.hanging !== undefined && over.ind.firstLine === undefined) delete ind.firstLine;
    if (over.ind?.firstLine !== undefined && over.ind.hanging === undefined) delete ind.hanging;
    if (over.ind?.hangingChars !== undefined) delete ind.firstLineChars;
    if (over.ind?.firstLineChars !== undefined) delete ind.hangingChars;
    out.ind = ind;
  }
  if (base.pBdr || over.pBdr) out.pBdr = { ...base.pBdr, ...over.pBdr };
  if (base.numPr || over.numPr) out.numPr = { ...base.numPr, ...over.numPr };
  const tabs = mergeTabs(base.tabs, over.tabs);
  if (tabs) out.tabs = tabs;
  if (base.rPr || over.rPr) out.rPr = mergeRPr(base.rPr, over.rPr);
  if (base.framePr || over.framePr) out.framePr = { ...base.framePr, ...over.framePr };
  return out;
}

function mergeBorders<T extends object>(base: T | undefined, over: T | undefined): T | undefined {
  if (!over) return base;
  if (!base) return { ...over };
  return { ...base, ...over };
}

function mergeMargins(base: CellMargins | undefined, over: CellMargins | undefined): CellMargins | undefined {
  if (!over) return base;
  if (!base) return { ...over };
  return { ...base, ...over };
}

export function mergeTblPr(base: TblPr | undefined, over: TblPr | undefined): TblPr {
  if (!over) return { ...(base ?? {}) };
  if (!base) return { ...over };
  const out: TblPr = { ...base, ...over };
  const b = mergeBorders(base.tblBorders, over.tblBorders);
  if (b) out.tblBorders = b;
  const m = mergeMargins(base.tblCellMar, over.tblCellMar);
  if (m) out.tblCellMar = m;
  if (base.tblLook || over.tblLook) out.tblLook = { ...base.tblLook, ...over.tblLook };
  return out;
}

export function mergeTrPr(base: TrPr | undefined, over: TrPr | undefined): TrPr {
  return { ...(base ?? {}), ...(over ?? {}) };
}

export function mergeTcPr(base: TcPr | undefined, over: TcPr | undefined): TcPr {
  if (!over) return { ...(base ?? {}) };
  if (!base) return { ...over };
  const out: TcPr = { ...base, ...over };
  const b = mergeBorders<TcBorders>(base.tcBorders, over.tcBorders);
  if (b) out.tcBorders = b;
  const m = mergeMargins(base.tcMar, over.tcMar);
  if (m) out.tcMar = m;
  return out;
}

// ───────────────────────── estilos ─────────────────────────

export interface ResolvedParaStyle {
  pPr: PPr;
  rPr: RPr;
}

export interface ResolvedTableStyle {
  tblPr: TblPr;
  trPr: TrPr;
  tcPr: TcPr;
  pPr: PPr;
  rPr: RPr;
  cond: Partial<Record<TblStyleType, TblStylePart>>;
  /** há estilo de tabela (próprio ou o padrão do documento): sem margens de célula
   *  nele, elas são 0 — o Word não usa os 108 twips embutidos (oráculo tblstyletr) */
  hasStyle?: boolean;
}

/** Ordem de aplicação das formatações condicionais (a última vence). */
export const COND_ORDER: TblStyleType[] = [
  'wholeTable', 'band1Vert', 'band2Vert', 'band1Horz', 'band2Horz',
  'firstCol', 'lastCol', 'firstRow', 'lastRow', 'nwCell', 'neCell', 'swCell', 'seCell',
];

export class StyleResolver {
  private paraCache = new Map<string, ResolvedParaStyle>();
  private charCache = new Map<string, RPr>();
  private tableCache = new Map<string, ResolvedTableStyle>();
  readonly styles: Record<string, StyleDef>;
  readonly docDefaults: { rPr?: RPr; pPr?: PPr };
  readonly defaults: DocFormatting['styles']['defaults'];

  constructor(readonly fmt: DocFormatting) {
    this.styles = fmt.styles.styles;
    this.docDefaults = fmt.styles.docDefaults;
    this.defaults = fmt.styles.defaults;
  }

  private chain(id: string | undefined, type: StyleDef['type']): StyleDef[] {
    const out: StyleDef[] = [];
    const seen = new Set<string>();
    let cur = id ? own(this.styles, id) : undefined;
    while (cur && !seen.has(cur.styleId) && out.length < 32) {
      if (cur.type !== type) break;
      seen.add(cur.styleId);
      out.unshift(cur);
      cur = cur.basedOn ? own(this.styles, cur.basedOn) : undefined;
    }
    return out;
  }

  /** Cadeia basedOn de um estilo de parágrafo (raiz primeiro). */
  paraChain(id: string | undefined): StyleDef[] {
    return this.chain(this.paraStyleId(id) ?? '', 'paragraph');
  }

  /** Estilo de parágrafo efetivo (ausente/inexistente → estilo padrão). */
  paraStyleId(id: string | undefined): string | undefined {
    if (id && own(this.styles, id)?.type === 'paragraph') return id;
    return this.defaults.paragraph;
  }

  paraStyle(id: string | undefined): ResolvedParaStyle {
    const key = this.paraStyleId(id) ?? '';
    let r = this.paraCache.get(key);
    if (!r) {
      let pPr: PPr = {};
      let rPr: RPr = {};
      for (const s of this.chain(key, 'paragraph')) {
        pPr = mergePPr(pPr, s.pPr);
        rPr = mergeRPr(rPr, s.rPr);
      }
      r = { pPr, rPr };
      this.paraCache.set(key, r);
    }
    return r;
  }

  charStyle(id: string | undefined): RPr {
    if (!id) return {};
    let r = this.charCache.get(id);
    if (!r) {
      r = {};
      for (const s of this.chain(id, 'character')) r = mergeRPr(r, s.rPr);
      // estilo "vinculado" usado como rStyle: vale o rPr do estilo de parágrafo
      if (!this.chain(id, 'character').length && own(this.styles, id)?.type === 'paragraph') r = this.paraStyle(id).rPr;
      this.charCache.set(id, r);
    }
    return r;
  }

  tableStyle(id: string | undefined): ResolvedTableStyle {
    const key = id && own(this.styles, id)?.type === 'table' ? id : (this.defaults.table ?? '');
    let r = this.tableCache.get(key);
    if (!r) {
      r = { tblPr: {}, trPr: {}, tcPr: {}, pPr: {}, rPr: {}, cond: {} };
      if (this.chain(key, 'table').length) r.hasStyle = true;
      for (const s of this.chain(key, 'table')) {
        r.tblPr = mergeTblPr(r.tblPr, s.tblPr);
        r.trPr = mergeTrPr(r.trPr, s.trPr);
        r.tcPr = mergeTcPr(r.tcPr, s.tcPr);
        r.pPr = mergePPr(r.pPr, s.pPr);
        r.rPr = mergeRPr(r.rPr, s.rPr);
        for (const [t, part] of Object.entries(s.tblStylePr ?? {}) as [TblStyleType, TblStylePart][]) {
          const prev = r.cond[t] ?? {};
          r.cond[t] = {
            pPr: mergePPr(prev.pPr, part.pPr),
            rPr: mergeRPr(prev.rPr, part.rPr),
            tblPr: mergeTblPr(prev.tblPr, part.tblPr),
            trPr: mergeTrPr(prev.trPr, part.trPr),
            tcPr: mergeTcPr(prev.tcPr, part.tcPr),
          };
        }
      }
      this.tableCache.set(key, r);
    }
    return r;
  }
}

/**
 * Combina os níveis de run com a semântica do Word: níveis de ESTILO
 * (tabela, parágrafo, caractere) — cada um já resolvido na sua cadeia basedOn —
 * aplicam as alternáveis por XOR; docDefaults é a base; o direto é absoluto.
 */
export function cascadeRPr(docDefaults: RPr | undefined, styleLevels: (RPr | undefined)[], direct: RPr | undefined): RPr {
  let out: RPr = { ...(docDefaults ?? {}) };
  const toggled: Partial<Record<ToggleKey, boolean>> = {};
  for (const lvl of styleLevels) {
    if (!lvl) continue;
    const { ...rest } = lvl;
    for (const k of TOGGLES) {
      if (lvl[k] === undefined) continue;
      delete (rest as Record<string, unknown>)[k];
      if (lvl[k]) toggled[k] = !(toggled[k] ?? false);
      else toggled[k] ??= false;
    }
    out = mergeRPr(out, rest);
  }
  for (const k of TOGGLES) {
    const t = toggled[k];
    if (t === undefined) continue;
    const base = docDefaults?.[k] ?? false;
    out[k] = t ? !base : base;
  }
  return mergeRPr(out, direct);
}

// ───────────────────────── fontes de tema ─────────────────────────

/** Nome de fonte de um slot rFonts (tema tem prioridade sobre o nome). */
export function fontOfSlot(rf: RFonts | undefined, slot: 'ascii' | 'hAnsi' | 'eastAsia' | 'cs', theme: Theme): string | undefined {
  if (!rf) return undefined;
  const themeKey = slot === 'cs' ? 'cstheme' : (`${slot}Theme` as 'asciiTheme' | 'hAnsiTheme' | 'eastAsiaTheme');
  const t = rf[themeKey];
  if (t) {
    const set = t.startsWith('major') ? theme.major : theme.minor;
    const name = t.endsWith('EastAsia') ? set.ea : t.endsWith('Bidi') ? set.cs : set.latin;
    if (name) return name;
  }
  return rf[slot];
}

// ───────────────────────── cores ─────────────────────────

/** Valor PRÓPRIO de um registro (nomes vindos do arquivo: "constructor", "__proto__"… não herdam). */
export const own = <T>(rec: Record<string, T> | undefined, k: string | undefined): T | undefined =>
  rec && k !== undefined && Object.hasOwn(rec, k) ? rec[k] : undefined;

const HIGHLIGHT: Record<string, string> = {
  yellow: 'FFFF00', green: '00FF00', cyan: '00FFFF', magenta: 'FF00FF', blue: '0000FF', red: 'FF0000',
  darkBlue: '000080', darkCyan: '008080', darkGreen: '008000', darkMagenta: '800080', darkRed: '800000',
  darkYellow: '808000', darkGray: '808080', lightGray: 'C0C0C0', black: '000000', white: 'FFFFFF',
};
export const highlightHex = (name: string | undefined): string | undefined => own(HIGHLIGHT, name);

const THEME_ALIAS: Record<string, string> = {
  text1: 'dk1', background1: 'lt1', text2: 'dk2', background2: 'lt2', dark1: 'dk1', light1: 'lt1', dark2: 'dk2', light2: 'lt2',
  hyperlink: 'hlink', followedHyperlink: 'folHlink', tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2',
};

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return (c(r) + c(g) + c(b)).toUpperCase();
}

/**
 * themeTint/themeShade do WordprocessingML: o Word mexe na LUMINOSIDADE em HSL
 * (shade: L·s; tint: L·t + 1 − t) a partir da cor do TEMA — o hex gravado ao
 * lado é ignorado — e trunca os canais (medido no PDF do Word: accent1 #156082
 * tint 33 → C1E4F5, tint 99 → 45B0E1, shade BF → 0F4761; ±1 num canal em
 * alguns tons).
 */
export function applyTintShade(hex: string, tint?: string, shade?: string): string {
  if (!tint && !shade) return hex.toUpperCase();
  const [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  if (shade) l *= parseInt(shade, 16) / 255;
  if (tint) { const t = parseInt(tint, 16) / 255; l = l * t + 1 - t; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const ch = (x: number): number => {
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    const v = x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p;
    return Math.floor(v * 255);
  };
  return toHex(ch(h + 1 / 3), ch(h), ch(h - 1 / 3));
}

/** Cor efetiva (RRGGBB) de val/themeColor/tint/shade; undefined = automática. */
export function resolveColor(
  spec: { val?: string; themeColor?: string; themeTint?: string; themeShade?: string } | undefined,
  theme: Theme,
): string | undefined {
  if (!spec) return undefined;
  if (spec.themeColor) {
    const key = own(THEME_ALIAS, spec.themeColor) ?? spec.themeColor;
    const base = own(theme.colors, key);
    if (base) return applyTintShade(base, spec.themeTint, spec.themeShade);
  }
  const v = spec.val;
  if (!v || v === 'auto') return undefined;
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : undefined;
}

/** Cor de DrawingML com modificadores ("RRGGBB|lumMod=75000,lumOff=…" ou "@accent1|…"). */
export function resolveDrawingColor(spec: string | undefined, theme: Theme): string | undefined {
  if (!spec) return undefined;
  const [head, mods] = spec.split('|');
  let hex = head!.startsWith('@') ? own(theme.colors, own(THEME_ALIAS, head!.slice(1)) ?? head!.slice(1)) : head;
  if (!hex || !/^[0-9A-Fa-f]{6}$/.test(hex)) return undefined;
  if (!mods) return hex.toUpperCase();
  let [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
  // HSL p/ lumMod/lumOff
  const toHsl = (): [number, number, number] => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn;
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  };
  const fromHsl = (h: number, s: number, l: number) => {
    if (s === 0) { r = g = b = l; return; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = f(h + 1 / 3); g = f(h); b = f(h - 1 / 3);
  };
  for (const m of mods.split(',')) {
    const [k, vs] = m.split('=');
    const v = parseInt(vs ?? '0', 10) / 100000;
    if (k === 'lumMod' || k === 'lumOff') {
      const [h, s, l] = toHsl();
      fromHsl(h, s, k === 'lumMod' ? Math.min(1, l * v) : Math.min(1, l + v));
    } else if (k === 'tint') {
      r = 1 - (1 - r) * v; g = 1 - (1 - g) * v; b = 1 - (1 - b) * v;
    } else if (k === 'shade') {
      r *= v; g *= v; b *= v;
    }
  }
  return toHex(r * 255, g * 255, b * 255);
}

export type { BorderSpec };

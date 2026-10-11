/**
 * Folha de estilos ([MS-DOC] STSH): Stshi (Stshif: contagem, fontes padrão)
 * + rglpstd (LPStd: cbStd + STD). Cada STD = Stdf (StdfBase + StdfPost2000) +
 * nome (Xstz) + UPXs (parágrafo: PAPX+CHPX; caractere: CHPX; tabela:
 * TAPX+PAPX+CHPX; numeração: PAPX). Também resolve a herança (basedOn) para
 * obter o CHP/PAP completo de cada estilo.
 */
import { ByteReader } from './bytes.js';
import { FC, type Fib } from './fib.js';
import { prls } from './sprm.js';
import {
  applyChp, applyPap, defaultChp, pruneNoneBorders,
  type Chp, type ChpKey, type Pap, type PapKey,
} from './props.js';

export interface Stshif {
  cstd: number;
  cbSTDBaseInFile: number;
  stdStylenamesWritten: boolean;
  stiMaxWhenSaved: number;
  ftcAsci: number;
  ftcFE: number;
  ftcOther: number;
  /** Fonte padrão de scripts complexos (Stshi.ftcBi, logo após o Stshif). */
  ftcBi: number;
}

export interface DocStyle {
  istd: number;
  sti: number;
  /** 1 parágrafo, 2 caractere, 3 tabela, 4 numeração. */
  stk: number;
  istdBase: number;
  istdNext: number;
  istdLink?: number;
  name: string;
  aliases?: string;
  autoRedef: boolean;
  hidden: boolean;
  semiHidden: boolean;
  locked: boolean;
  unhideWhenUsed: boolean;
  qFormat: boolean;
  priority?: number;
  papx?: Uint8Array;
  chpx?: Uint8Array;
  tapx?: Uint8Array;
}

export const ISTD_NIL = 0x0fff;

export interface StyleSheet {
  stshif: Stshif;
  styles: (DocStyle | undefined)[];
}

export function readStsh(fib: Fib, table: Uint8Array): StyleSheet {
  const { fc, lcb } = fib.fcLcb(FC.Stshf);
  const empty: StyleSheet = {
    stshif: { cstd: 0, cbSTDBaseInFile: 10, stdStylenamesWritten: true, stiMaxWhenSaved: 0, ftcAsci: 0, ftcFE: 0, ftcOther: 0, ftcBi: 0 },
    styles: [],
  };
  if (!lcb || fc + lcb > table.length) return empty;
  const r = new ByteReader(table);
  const end = fc + lcb;
  const cbStshi = r.u16(fc);
  const s = fc + 2;
  const stshif: Stshif = {
    cstd: r.u16(s),
    cbSTDBaseInFile: r.u16(s + 2) || 10,
    stdStylenamesWritten: (r.u16(s + 4) & 1) !== 0,
    stiMaxWhenSaved: r.u16(s + 6),
    ftcAsci: r.u16(s + 12),
    ftcFE: r.u16(s + 14),
    ftcOther: r.u16(s + 16),
    ftcBi: cbStshi >= 20 ? r.u16(s + 18) : 0,
  };
  let off = s + cbStshi;
  const styles: (DocStyle | undefined)[] = [];
  for (let istd = 0; istd < stshif.cstd && off + 2 <= end; istd++) {
    const cbStd = r.u16(off);
    const std = off + 2;
    off = std + cbStd;
    if ((off - fc) & 1) off++; // LPStd em fronteira par
    if (!cbStd) { styles.push(undefined); continue; }
    const stdEnd = Math.min(std + cbStd, end);
    const w0 = r.u16(std), w1 = r.u16(std + 2), w2 = r.u16(std + 4);
    const grf = r.u16(std + 8);
    const st: DocStyle = {
      istd,
      sti: w0 & 0x0fff,
      stk: w1 & 0x0f,
      istdBase: (w1 >> 4) & 0x0fff,
      istdNext: (w2 >> 4) & 0x0fff,
      name: '',
      autoRedef: (grf & 0x0001) !== 0,
      hidden: (grf & 0x0002) !== 0,
      semiHidden: (grf & 0x0100) !== 0,
      locked: (grf & 0x0200) !== 0,
      unhideWhenUsed: (grf & 0x0800) !== 0,
      qFormat: (grf & 0x1000) !== 0,
    };
    const cupx = w2 & 0x0f;
    if (stshif.cbSTDBaseInFile >= 18) {
      const link = r.u16(std + 10) & 0x0fff;
      if (link && link !== ISTD_NIL) st.istdLink = link;
      const pri = (r.u16(std + 16) >> 4) & 0x0fff;
      st.priority = pri;
    }
    // nome: Xstz (cch u16 + UTF-16 + terminador)
    let o = std + stshif.cbSTDBaseInFile;
    const cch = r.u16(o);
    const full = r.utf16(o + 2, cch);
    o += 2 + cch * 2 + 2;
    const comma = full.indexOf(',');
    st.name = comma >= 0 ? full.slice(0, comma) : full;
    if (comma >= 0) st.aliases = full.slice(comma + 1);
    // UPXs, cada um com cbUpx (u16) e alinhado em fronteira par
    const upxs: Uint8Array[] = [];
    for (let k = 0; k < cupx && o + 2 <= stdEnd; k++) {
      const cbUpx = r.u16(o);
      upxs.push(r.sub(o + 2, Math.min(o + 2 + cbUpx, stdEnd)));
      o += 2 + cbUpx;
      if ((o - std) & 1) o++;
    }
    // UpxPapx começa com istd (u16)
    const papxOf = (u: Uint8Array | undefined): Uint8Array | undefined => (u && u.length >= 2 ? u.subarray(2) : undefined);
    if (st.stk === 1) { st.papx = papxOf(upxs[0]); st.chpx = upxs[1]; }
    else if (st.stk === 2) { st.chpx = upxs[0]; }
    else if (st.stk === 3) { st.tapx = upxs[0]; st.papx = papxOf(upxs[1]); st.chpx = upxs[2]; }
    else if (st.stk === 4) { st.papx = papxOf(upxs[0]); }
    styles.push(st);
  }
  return { stshif, styles };
}

// ───────────────────────────── resolução ─────────────────────────────

export interface ResolvedStyle {
  pap: Pap;
  chp: Chp;
  /** Delta próprio (o que o UPX do estilo toca), com valores finais. */
  ownPap: Set<PapKey>;
  ownChp: Set<ChpKey>;
}

export class StyleResolver {
  readonly sheet: StyleSheet;
  private readonly memo = new Map<number, ResolvedStyle>();
  private readonly charMemo = new Map<number, Uint8Array[]>();
  readonly rootChp: Chp;

  constructor(sheet: StyleSheet) {
    this.sheet = sheet;
    const f = sheet.stshif;
    this.rootChp = { ...defaultChp(f.ftcAsci, f.ftcFE, f.ftcOther), ftcBi: f.ftcBi };
  }

  style(istd: number): DocStyle | undefined { return this.sheet.styles[istd]; }

  /** Estilo de parágrafo (ou tabela/numeração) resolvido com a herança. */
  resolve(istd: number, depth = 0): ResolvedStyle {
    const hit = this.memo.get(istd);
    if (hit) return hit;
    const st = this.style(istd);
    let parent: ResolvedStyle;
    if (st && st.istdBase !== ISTD_NIL && st.istdBase !== istd && depth < 32 && this.style(st.istdBase)) {
      parent = this.resolve(st.istdBase, depth + 1);
    } else {
      parent = { pap: { istd, widowControl: true }, chp: { ...this.rootChp }, ownPap: new Set(), ownChp: new Set() };
    }
    const pap: Pap = { ...parent.pap, istd, tabsCleared: [] };
    const chp: Chp = { ...parent.chp };
    const ownPap = new Set<PapKey>();
    const ownChp = new Set<ChpKey>();
    if (st?.papx) for (const p of prls(st.papx)) applyPap(pap, p, ownPap);
    pruneNoneBorders(pap, parent.pap, ownPap);
    if (st?.chpx) {
      const ctx = { base: { ...parent.chp } };
      for (const p of prls(st.chpx)) if (p.sprm !== 0x4a30) applyChp(chp, p, ctx, ownChp);
    }
    // estilos de título (istd 1-9) implicam nível de estrutura
    const res: ResolvedStyle = { pap, chp, ownPap, ownChp };
    this.memo.set(istd, res);
    return res;
  }

  /** grpprls da cadeia de um estilo de caractere (raiz → folha). */
  private charChain(istd: number): Uint8Array[] {
    const hit = this.charMemo.get(istd);
    if (hit) return hit;
    const chain: Uint8Array[] = [];
    const seen = new Set<number>();
    let cur = istd;
    while (cur !== ISTD_NIL && !seen.has(cur) && chain.length < 32) {
      seen.add(cur);
      const st = this.style(cur);
      if (!st || st.stk !== 2) break;
      if (st.chpx) chain.unshift(st.chpx);
      cur = st.istdBase;
    }
    this.charMemo.set(istd, chain);
    return chain;
  }

  /** CHP de um estilo de caractere aplicado sobre o CHP do parágrafo. */
  applyCharStyle(istd: number, onTop: Chp): Chp {
    const chp: Chp = { ...onTop };
    for (const g of this.charChain(istd)) {
      const ctx = { base: { ...chp } };
      const dummy = new Set<ChpKey>();
      for (const p of prls(g)) if (p.sprm !== 0x4a30) applyChp(chp, p, ctx, dummy);
    }
    chp.istd = istd;
    return chp;
  }

  /** Delta próprio de um estilo de caractere (contra o pai na cadeia). */
  resolveChar(istd: number): { chp: Chp; own: Set<ChpKey> } {
    const st = this.style(istd);
    const parentChp = st && st.istdBase !== ISTD_NIL && st.istdBase !== istd
      ? this.applyCharStyle(st.istdBase, this.rootChp)
      : { ...this.rootChp };
    const chp: Chp = { ...parentChp };
    const own = new Set<ChpKey>();
    if (st?.chpx) {
      const ctx = { base: { ...parentChp } };
      for (const p of prls(st.chpx)) if (p.sprm !== 0x4a30) applyChp(chp, p, ctx, own);
    }
    return { chp, own };
  }
}

/**
 * Propriedades de caractere (CHP), parágrafo (PAP), tabela (TAP) e seção (SEP)
 * e a aplicação de sprms sobre elas ([MS-DOC] 2.6). Cada aplicação marca o
 * campo como "tocado" — o gravador OOXML emite só o que foi tocado (formatação
 * direta / delta do estilo), com o valor final já resolvido (toggles 0x80/0x81
 * contra o valor do estilo).
 */
import { type Prl, prls, opU8, opU16, opI16, opU32, opI32 } from './sprm.js';

// ───────────────────────────── tipos auxiliares ─────────────────────────────

/** Cor: 0xRRGGBB ou AUTO. */
export const AUTO = -1;

export interface Brc {
  /** 0xRRGGBB ou AUTO. */
  color: number;
  /** Largura em 1/8 pt. */
  width: number;
  /** BrcType ([MS-DOC] 2.9.17). 0 = nenhuma; 0xFF = nil. */
  type: number;
  /** Distância ao texto, em pontos. */
  space: number;
  shadow: boolean;
  frame: boolean;
}

export interface Shd {
  fore: number;
  back: number;
  /** Ipat ([MS-DOC] 2.9.127). 0xFFFF = nil. */
  pat: number;
}

/** Ico ([MS-DOC] 2.9.119) → cor. */
export const ICO_RGB = [
  AUTO, 0x000000, 0x0000ff, 0x00ffff, 0x00ff00, 0xff00ff, 0xff0000, 0xffff00,
  0xffffff, 0x000080, 0x008080, 0x008000, 0x800080, 0x800000, 0x808000, 0x808080, 0xc0c0c0,
];

export function icoColor(ico: number): number {
  return ICO_RGB[ico] ?? AUTO;
}

/** COLORREF (r, g, b, fAuto) → cor. */
export function colorRef(v: number): number {
  if ((v >>> 24) === 0xff) return AUTO;
  const r = v & 0xff, g = (v >>> 8) & 0xff, b = (v >>> 16) & 0xff;
  return (r << 16) | (g << 8) | b;
}

/** Brc80 (4 bytes). 0xFFFFFFFF = nil (Brc80MayBeNil). */
export function brc80(r: Prl['r'], off: number): Brc | undefined {
  const v = r.u32(off);
  if (v === 0xffffffff) return undefined;
  const flags = r.u8(off + 3);
  return {
    width: r.u8(off), type: r.u8(off + 1), color: icoColor(r.u8(off + 2)),
    space: flags & 0x1f, shadow: (flags & 0x20) !== 0, frame: (flags & 0x40) !== 0,
  };
}

/** Brc (8 bytes): cv, dptLineWidth, brcType, dptSpace/flags. */
export function brcNew(r: Prl['r'], off: number): Brc | undefined {
  if (r.u32(off) === 0xffffffff && r.u32(off + 4) === 0xffffffff) return undefined;
  const flags = r.u16(off + 6);
  return {
    color: colorRef(r.u32(off)), width: r.u8(off + 4), type: r.u8(off + 5),
    space: flags & 0x1f, shadow: (flags & 0x20) !== 0, frame: (flags & 0x40) !== 0,
  };
}

/** SHD80 (u16): icoFore 5 bits, icoBack 5 bits, ipat 6 bits. */
export function shd80(v: number): Shd {
  const pat = (v >>> 10) & 0x3f;
  return { fore: icoColor(v & 0x1f), back: icoColor((v >>> 5) & 0x1f), pat: pat === 0x3f ? 0xffff : pat };
}

/** SHD (10 bytes): cvFore, cvBack, ipat. */
export function shdNew(r: Prl['r'], off: number): Shd {
  return { fore: colorRef(r.u32(off)), back: colorRef(r.u32(off + 4)), pat: r.u16(off + 8) };
}

// ───────────────────────────── caractere ─────────────────────────────

export interface Chp {
  bold?: boolean; italic?: boolean; strike?: boolean; dstrike?: boolean;
  outline?: boolean; shadow?: boolean; emboss?: boolean; imprint?: boolean;
  smallCaps?: boolean; caps?: boolean; vanish?: boolean; specVanish?: boolean; webHidden?: boolean;
  boldBi?: boolean; italicBi?: boolean; rtl?: boolean; cs?: boolean; noProof?: boolean;
  kul?: number; cvUl?: number;
  hps?: number; hpsBi?: number; hpsPos?: number; hpsKern?: number;
  ico?: number; cv?: number; highlight?: number;
  iss?: number; dxaSpace?: number; charScale?: number; kcd?: number;
  ftcAscii?: number; ftcFE?: number; ftcOther?: number; ftcBi?: number;
  lid?: number; lidFE?: number; lidBi?: number;
  /** Estilo de caractere. */
  istd?: number;
  fSpec?: boolean; fData?: boolean; fOle2?: boolean; fObj?: boolean;
  picLocation?: number;
  symbol?: { ftc: number; xchar: number };
  shd?: Shd; brc?: Brc;
  rmarkDel?: boolean; rmarkIns?: boolean; ibstRMark?: number; dttmRMark?: number;
  ibstRMarkDel?: number; dttmRMarkDel?: number;
  fldVanish?: boolean;
  idctHint?: number;
  sfxText?: number;
}

export type ChpKey = keyof Chp;

/** CHP padrão de um documento (antes de qualquer estilo). */
export function defaultChp(ftcAscii: number, ftcFE: number, ftcOther: number): Chp {
  return { hps: 20, hpsBi: 20, ftcAscii, ftcFE, ftcOther, ftcBi: 0, lid: 0x0400, lidFE: 0x0400, lidBi: 0x0400, istd: 10 };
}

const TOGGLES: Record<number, ChpKey> = {
  0x0835: 'bold', 0x0836: 'italic', 0x0837: 'strike', 0x0838: 'outline', 0x0839: 'shadow',
  0x083a: 'smallCaps', 0x083b: 'caps', 0x083c: 'vanish', 0x0858: 'emboss', 0x0854: 'imprint',
  0x085c: 'boldBi', 0x085d: 'italicBi',
};

export interface ChpCtx {
  /** Valores do estilo (para toggles 0x80/0x81). */
  base: Chp;
  /** sprmCIstd: devolve o CHP do estilo de caractere aplicado sobre o do parágrafo. */
  applyCharStyle?: (istd: number) => Chp;
  /** sprmCPlain: CHP do estilo de parágrafo. */
  paraStyle?: Chp;
}

const PRESERVED: ChpKey[] = ['rmarkDel', 'rmarkIns', 'rtl', 'cs', 'fldVanish', 'fSpec', 'fData', 'fOle2', 'fObj', 'picLocation', 'webHidden', 'specVanish', 'ibstRMark', 'dttmRMark', 'ibstRMarkDel', 'dttmRMarkDel'];

function setAll(target: Chp, src: Chp, keep: Chp): void {
  for (const k of Object.keys(target) as ChpKey[]) delete target[k];
  Object.assign(target, src);
  for (const k of PRESERVED) if (keep[k] !== undefined) (target as Record<string, unknown>)[k] = keep[k];
}

/** Aplica um Prl de caractere (sprms de outras classes são ignorados). */
export function applyChp(chp: Chp, p: Prl, ctx: ChpCtx, touched: Set<ChpKey>): void {
  const t = (k: ChpKey): void => { touched.add(k); };
  const tog = TOGGLES[p.sprm];
  if (tog) {
    const v = opU8(p);
    const baseV = !!ctx.base[tog];
    (chp as Record<string, unknown>)[tog] = v === 0x80 ? baseV : v === 0x81 ? !baseV : v !== 0;
    t(tog);
    return;
  }
  switch (p.sprm) {
    case 0x0800: chp.rmarkDel = opU8(p) !== 0; t('rmarkDel'); break;
    case 0x0801: chp.rmarkIns = opU8(p) !== 0; t('rmarkIns'); break;
    case 0x0802: chp.fldVanish = opU8(p) !== 0; t('fldVanish'); break;
    case 0x6a03: chp.picLocation = opI32(p); t('picLocation'); break;
    case 0x4804: chp.ibstRMark = opU16(p); break;
    case 0x6805: chp.dttmRMark = opU32(p); break;
    case 0x0806: chp.fData = opU8(p) !== 0; t('fData'); break;
    case 0x6a09: chp.symbol = { ftc: p.r.u16(p.op), xchar: p.r.u16(p.op + 2) }; t('symbol'); break;
    case 0x080a: chp.fOle2 = opU8(p) !== 0; t('fOle2'); break;
    case 0x2a0c: chp.highlight = opU8(p); t('highlight'); break;
    case 0x0811: chp.webHidden = opU8(p) !== 0; t('webHidden'); break;
    case 0x0818: chp.specVanish = opU8(p) !== 0; t('specVanish'); break;
    case 0x4a30: { // sprmCIstd
      const istd = opU16(p);
      if (ctx.applyCharStyle) {
        const st = ctx.applyCharStyle(istd);
        setAll(chp, st, chp);
        ctx.base = { ...st };
        touched.clear();
      }
      chp.istd = istd;
      t('istd');
      break;
    }
    case 0x2a33: { // sprmCPlain
      if (ctx.paraStyle) {
        setAll(chp, ctx.paraStyle, chp);
        ctx.base = { ...ctx.paraStyle };
        touched.clear();
      }
      break;
    }
    case 0x2a34: chp.kcd = opU8(p); t('kcd'); break;
    case 0x2a3e: chp.kul = opU8(p); t('kul'); break;
    case 0x8840: chp.dxaSpace = opI16(p); t('dxaSpace'); break;
    case 0x2a42: chp.ico = opU8(p); delete chp.cv; t('ico'); touched.delete('cv'); break;
    case 0x4a43: chp.hps = opU16(p); t('hps'); break;
    case 0x2a44: chp.hps = Math.max(2, (chp.hps ?? 20) + (p.r.i8(p.op) * 2)); t('hps'); break;
    case 0x4845: chp.hpsPos = opI16(p); t('hpsPos'); break;
    case 0x2a48: chp.iss = opU8(p); t('iss'); break;
    case 0x484b: chp.hpsKern = opU16(p); t('hpsKern'); break;
    case 0x4a4f: chp.ftcAscii = opU16(p); t('ftcAscii'); break;
    case 0x4a50: chp.ftcFE = opU16(p); t('ftcFE'); break;
    case 0x4a51: chp.ftcOther = opU16(p); t('ftcOther'); break;
    case 0x4852: chp.charScale = opU16(p); t('charScale'); break;
    case 0x2a53: chp.dstrike = opU8(p) !== 0; t('dstrike'); break;
    case 0x0855: chp.fSpec = opU8(p) !== 0; t('fSpec'); break;
    case 0x0856: chp.fObj = opU8(p) !== 0; t('fObj'); break;
    case 0x2859: chp.sfxText = opU8(p); t('sfxText'); break;
    case 0x085a: chp.rtl = opU8(p) !== 0; t('rtl'); break;
    case 0x4a5e: chp.ftcBi = opU16(p); t('ftcBi'); break;
    case 0x485f: chp.lidBi = opU16(p); t('lidBi'); break;
    case 0x4a60: break; // sprmCIcoBi
    case 0x4a61: chp.hpsBi = opU16(p); t('hpsBi'); break;
    case 0x4863: chp.ibstRMarkDel = opU16(p); break;
    case 0x6864: chp.dttmRMarkDel = opU32(p); break;
    case 0x6865: { const b = brc80(p.r, p.op); if (b) chp.brc = b; else delete chp.brc; t('brc'); break; }
    case 0x4866: chp.shd = shd80(opU16(p)); t('shd'); break;
    case 0x286f: chp.idctHint = opU8(p); t('idctHint'); break;
    case 0x6870: {
      // cvAuto depois de sprmCIco: o Word mantém a cor do ico (medido no Word)
      const cv = colorRef(opU32(p));
      if (cv === AUTO) { delete chp.cv; touched.delete('cv'); if (!touched.has('ico')) { chp.ico = 0; t('ico'); } }
      else { chp.cv = cv; t('cv'); }
      break;
    }
    case 0xca71: chp.shd = shdNew(p.r, p.op); t('shd'); break;
    case 0xca72: { const b = brcNew(p.r, p.op); if (b) chp.brc = b; else delete chp.brc; t('brc'); break; }
    case 0x486d: case 0x4873: chp.lid = opU16(p); t('lid'); break;
    case 0x486e: case 0x4874: chp.lidFE = opU16(p); t('lidFE'); break;
    case 0x0875: chp.noProof = opU8(p) !== 0; t('noProof'); break;
    case 0x6877: chp.cvUl = colorRef(opU32(p)); t('cvUl'); break;
    case 0x0882: chp.cs = opU8(p) !== 0; t('cs'); break;
    case 0xca47: { // sprmCMajority: propriedades iguais às do grpprl voltam ao estilo
      if (!ctx.paraStyle) break;
      const probe: Chp = {};
      const sub = p.r.sub(p.op, p.op + p.len);
      const dummy = new Set<ChpKey>();
      for (const q of prls(sub)) applyChp(probe, q, { base: {} }, dummy);
      for (const k of dummy) {
        if (JSON.stringify(chp[k]) === JSON.stringify(probe[k])) {
          (chp as Record<string, unknown>)[k] = ctx.paraStyle[k];
          touched.delete(k);
        }
      }
      break;
    }
  }
}

// ───────────────────────────── parágrafo ─────────────────────────────

export interface TabStop {
  pos: number;
  /** 0 esquerda, 1 centro, 2 direita, 3 decimal, 4 barra, 6 lista. */
  jc: number;
  /** 0 nenhum, 1 pontos, 2 hífens, 3 linha, 4 grossa, 5 ponto médio. */
  tlc: number;
}

export interface Pap {
  istd: number;
  jc?: number;
  dxaLeft?: number; dxaRight?: number; dxaLeft1?: number;
  dxcLeft?: number; dxcRight?: number; dxcLeft1?: number;
  dyaBefore?: number; dyaAfter?: number; beforeAuto?: boolean; afterAuto?: boolean;
  dylBefore?: number; dylAfter?: number;
  lineSpacing?: { line: number; mult: boolean };
  keep?: boolean; keepFollow?: boolean; pageBreakBefore?: boolean; widowControl?: boolean;
  noLineNumb?: boolean; noAutoHyph?: boolean; contextualSpacing?: boolean; mirrorIndents?: boolean;
  kinsoku?: boolean; wordWrap?: boolean; overflowPunct?: boolean; topLinePunct?: boolean;
  autoSpaceDE?: boolean; autoSpaceDN?: boolean; bidi?: boolean; adjustRight?: boolean;
  usePgsuSettings?: boolean; wAlignFont?: number;
  ilfo?: number; ilvl?: number; outLvl?: number;
  /** Tabulações efetivas (ordenadas por posição). */
  tabs?: TabStop[];
  /** Posições removidas (relativas ao estilo) pelos sprms deste nível. */
  tabsCleared?: number[];
  brcTop?: Brc; brcLeft?: Brc; brcBottom?: Brc; brcRight?: Brc; brcBetween?: Brc; brcBar?: Brc;
  shd?: Shd;
  inTable?: boolean; ttp?: boolean; itap?: number; innerTableCell?: boolean; innerTtp?: boolean;
  // moldura (frame)
  dxaAbs?: number; dyaAbs?: number; dxaWidth?: number; pc?: number; wr?: number;
  wHeightAbs?: number; dyaFromText?: number; dxaFromText?: number; frameLocked?: boolean;
  dcs?: number;
  /** sprmPTableProps/huge: grpprl de tabela referenciado (Data stream). */
  tableGrpprl?: Uint8Array;
}

export type PapKey = keyof Pap;

/** Aplica sprmPChgTabs/sprmPChgTabsPapx: remove posições e acrescenta tabs. */
function chgTabs(pap: Pap, p: Prl, withClose: boolean): void {
  const r = p.r;
  let o = p.op;
  const cDel = r.u8(o); o += 1;
  const dels: number[] = [];
  for (let i = 0; i < cDel; i++) dels.push(r.i16(o + i * 2));
  // sprmPChgTabs: rgdxaClose (tolerância) segue os deletes
  const closes: number[] = [];
  if (withClose) for (let i = 0; i < cDel; i++) closes.push(r.i16(o + cDel * 2 + i * 2));
  o += cDel * 2 * (withClose ? 2 : 1);
  const cAdd = r.u8(o); o += 1;
  const adds: TabStop[] = [];
  for (let i = 0; i < cAdd; i++) {
    const tbd = r.u8(o + cAdd * 2 + i);
    adds.push({ pos: r.i16(o + i * 2), jc: tbd & 7, tlc: (tbd >> 3) & 7 });
  }
  let tabs = pap.tabs ? [...pap.tabs] : [];
  const cleared = new Set(pap.tabsCleared ?? []);
  for (let i = 0; i < dels.length; i++) {
    const d = dels[i]!;
    const tol = withClose ? Math.abs(closes[i] ?? 0) : 0;
    const before = tabs.length;
    tabs = tabs.filter((tb) => Math.abs(tb.pos - d) > tol);
    if (tabs.length !== before || !withClose) cleared.add(d);
  }
  for (const a of adds) {
    tabs = tabs.filter((tb) => tb.pos !== a.pos);
    tabs.push(a);
    cleared.delete(a.pos);
  }
  // a ordem gravada é mantida (o Word não reordena ao converter)
  pap.tabs = tabs;
  pap.tabsCleared = [...cleared];
}

export function lspd(p: Prl): { line: number; mult: boolean } {
  return { line: p.r.i16(p.op), mult: p.r.i16(p.op + 2) !== 0 };
}

export interface PapCtx {
  /** sprmPIstd: troca o estilo (o chamador decide se reinicia). */
  onIstd?: (istd: number) => void;
}

export function applyPap(pap: Pap, p: Prl, touched: Set<PapKey>, ctx: PapCtx = {}): void {
  const t = (k: PapKey): void => { touched.add(k); };
  const b8 = (): boolean => opU8(p) !== 0;
  switch (p.sprm) {
    case 0x4600: pap.istd = opU16(p); ctx.onIstd?.(pap.istd); break;
    case 0x2602: { // sprmPIncLvl
      const d = p.r.i8(p.op);
      if (pap.istd >= 1 && pap.istd <= 9) { pap.istd = Math.min(9, Math.max(1, pap.istd + d)); ctx.onIstd?.(pap.istd); }
      else if ((pap.outLvl ?? 9) !== 9) { pap.outLvl = Math.min(9, Math.max(0, (pap.outLvl ?? 9) + d)); t('outLvl'); }
      break;
    }
    case 0x2403: if (!touched.has('jc') || pap.jc === undefined) { pap.jc = opU8(p); t('jc'); } break;
    case 0x2461: pap.jc = opU8(p); t('jc'); break;
    case 0x2405: pap.keep = b8(); t('keep'); break;
    case 0x2406: pap.keepFollow = b8(); t('keepFollow'); break;
    case 0x2407: pap.pageBreakBefore = b8(); t('pageBreakBefore'); break;
    case 0x260a: pap.ilvl = opU8(p); t('ilvl'); break;
    case 0x460b: pap.ilfo = opI16(p); t('ilfo'); break;
    case 0x240c: pap.noLineNumb = b8(); t('noLineNumb'); break;
    case 0xc60d: chgTabs(pap, p, false); t('tabs'); break;
    case 0xc615: chgTabs(pap, p, true); t('tabs'); break;
    case 0x840e: case 0x845d: pap.dxaRight = opI16(p); t('dxaRight'); delete pap.dxcRight; break;
    case 0x840f: case 0x845e: pap.dxaLeft = opI16(p); t('dxaLeft'); delete pap.dxcLeft; break;
    case 0x4610: case 0x465f: pap.dxaLeft = (pap.dxaLeft ?? 0) + opI16(p); t('dxaLeft'); break;
    case 0x8411: case 0x8460: pap.dxaLeft1 = opI16(p); t('dxaLeft1'); delete pap.dxcLeft1; break;
    case 0x4456: pap.dxcLeft = opI16(p); t('dxcLeft'); break;
    case 0x4455: pap.dxcRight = opI16(p); t('dxcRight'); break;
    case 0x4457: pap.dxcLeft1 = opI16(p); t('dxcLeft1'); break;
    case 0x6412: pap.lineSpacing = lspd(p); t('lineSpacing'); break;
    case 0xa413: pap.dyaBefore = opU16(p); t('dyaBefore'); break;
    case 0xa414: pap.dyaAfter = opU16(p); t('dyaAfter'); break;
    case 0x4458: pap.dylBefore = opI16(p); t('dylBefore'); break;
    case 0x4459: pap.dylAfter = opI16(p); t('dylAfter'); break;
    case 0x245b: pap.beforeAuto = b8(); t('beforeAuto'); break;
    case 0x245c: pap.afterAuto = b8(); t('afterAuto'); break;
    case 0x2416: pap.inTable = b8(); break;
    case 0x2417: pap.ttp = b8(); break;
    case 0x6649: pap.itap = opI32(p); break;
    case 0x664a: pap.itap = Math.max(0, (pap.itap ?? 0) + opI32(p)); break;
    case 0x244b: pap.innerTableCell = b8(); break;
    case 0x244c: pap.innerTtp = b8(); break;
    case 0x8418: pap.dxaAbs = opI16(p); t('dxaAbs'); break;
    case 0x8419: pap.dyaAbs = opI16(p); t('dyaAbs'); break;
    case 0x841a: pap.dxaWidth = opI16(p); t('dxaWidth'); break;
    case 0x261b: pap.pc = opU8(p); t('pc'); break;
    case 0x2423: pap.wr = opU8(p); t('wr'); break;
    case 0x442b: pap.wHeightAbs = opU16(p); t('wHeightAbs'); break;
    case 0x442c: pap.dcs = opU16(p); t('dcs'); break;
    case 0x842e: pap.dyaFromText = opI16(p); t('dyaFromText'); break;
    case 0x842f: pap.dxaFromText = opI16(p); t('dxaFromText'); break;
    case 0x2430: pap.frameLocked = b8(); t('frameLocked'); break;
    case 0x6424: setBrc(pap, 'brcTop', brc80(p.r, p.op)); t('brcTop'); break;
    case 0x6425: setBrc(pap, 'brcLeft', brc80(p.r, p.op)); t('brcLeft'); break;
    case 0x6426: setBrc(pap, 'brcBottom', brc80(p.r, p.op)); t('brcBottom'); break;
    case 0x6427: setBrc(pap, 'brcRight', brc80(p.r, p.op)); t('brcRight'); break;
    case 0x6428: setBrc(pap, 'brcBetween', brc80(p.r, p.op)); t('brcBetween'); break;
    case 0x6629: setBrc(pap, 'brcBar', brc80(p.r, p.op)); t('brcBar'); break;
    case 0xc64e: setBrc(pap, 'brcTop', brcNew(p.r, p.op)); t('brcTop'); break;
    case 0xc64f: setBrc(pap, 'brcLeft', brcNew(p.r, p.op)); t('brcLeft'); break;
    case 0xc650: setBrc(pap, 'brcBottom', brcNew(p.r, p.op)); t('brcBottom'); break;
    case 0xc651: setBrc(pap, 'brcRight', brcNew(p.r, p.op)); t('brcRight'); break;
    case 0xc652: setBrc(pap, 'brcBetween', brcNew(p.r, p.op)); t('brcBetween'); break;
    case 0xc653: setBrc(pap, 'brcBar', brcNew(p.r, p.op)); t('brcBar'); break;
    case 0x242a: pap.noAutoHyph = b8(); t('noAutoHyph'); break;
    case 0x442d: pap.shd = shd80(opU16(p)); t('shd'); break;
    case 0xc64d: pap.shd = shdNew(p.r, p.op); t('shd'); break;
    case 0x2431: pap.widowControl = b8(); t('widowControl'); break;
    case 0x2433: pap.kinsoku = b8(); t('kinsoku'); break;
    case 0x2434: pap.wordWrap = b8(); t('wordWrap'); break;
    case 0x2435: pap.overflowPunct = b8(); t('overflowPunct'); break;
    case 0x2436: pap.topLinePunct = b8(); t('topLinePunct'); break;
    case 0x2437: pap.autoSpaceDE = b8(); t('autoSpaceDE'); break;
    case 0x2438: pap.autoSpaceDN = b8(); t('autoSpaceDN'); break;
    case 0x4439: pap.wAlignFont = opU16(p); t('wAlignFont'); break;
    case 0x2640: pap.outLvl = opU8(p); t('outLvl'); break;
    case 0x2441: pap.bidi = b8(); t('bidi'); break;
    case 0x2447: pap.usePgsuSettings = b8(); t('usePgsuSettings'); break;
    case 0x2448: pap.adjustRight = b8(); t('adjustRight'); break;
    case 0x246d: pap.contextualSpacing = b8(); t('contextualSpacing'); break;
    case 0x2470: pap.mirrorIndents = b8(); t('mirrorIndents'); break;
  }
}

/** Borda "nenhuma" (ausente, brcType 0 ou nil). */
export function brcNone(b: Brc | undefined): boolean {
  return !b || b.type === 0 || b.type === 0xff;
}

/** Bordas de parágrafo "nenhuma" sobre base também sem borda não são gravadas (como o Word). */
export function pruneNoneBorders(pap: Pap, base: Pap, touched: Set<PapKey>): void {
  for (const k of ['brcTop', 'brcLeft', 'brcBottom', 'brcRight', 'brcBetween', 'brcBar'] as const) {
    if (touched.has(k) && brcNone(pap[k]) && brcNone(base[k])) touched.delete(k);
  }
}

function setBrc(pap: Pap, k: 'brcTop' | 'brcLeft' | 'brcBottom' | 'brcRight' | 'brcBetween' | 'brcBar', b: Brc | undefined): void {
  if (b) pap[k] = b; else delete pap[k];
}

// ───────────────────────────── tabela ─────────────────────────────

export interface Tc {
  horzMerge: number;
  vertMerge: number;
  vertAlign: number;
  textFlow: number;
  ftsWidth: number;
  wWidth: number;
  fitText: boolean;
  noWrap: boolean;
  hideMark: boolean;
  brcTop?: Brc; brcLeft?: Brc; brcBottom?: Brc; brcRight?: Brc;
  /** Bordas definidas explicitamente (TC80 não-nil ou sprmTSetBrc). */
  brcSet: { top: boolean; left: boolean; bottom: boolean; right: boolean };
  shd?: Shd;
  /** Margens da célula (sprmTCellPadding), twips. */
  mar: { top?: number; left?: number; bottom?: number; right?: number };
}

export interface TableBorders { top?: Brc; left?: Brc; bottom?: Brc; right?: Brc; insideH?: Brc; insideV?: Brc }

export interface Tap {
  jc?: number;
  dxaLeft?: number;
  dxaGapHalf?: number;
  rowHeight?: number;
  cantSplit?: boolean;
  header?: boolean;
  borders: TableBorders;
  bordersSet: boolean;
  centers: number[];
  tcs: Tc[];
  tableWidth?: { fts: number; w: number };
  widthBefore?: { fts: number; w: number };
  widthAfter?: { fts: number; w: number };
  widthIndent?: { fts: number; w: number };
  autofit?: boolean;
  padding: { top?: number; left?: number; bottom?: number; right?: number };
  spacing?: number;
  istd?: number;
  tlp?: { itl: number; grfatl: number };
  shdTable?: Shd;
  bidi?: boolean;
  /** posicionamento flutuante */
  pc?: number; dxaAbs?: number; dyaAbs?: number;
  dxaFromText?: number; dyaFromText?: number; dxaFromTextRight?: number; dyaFromTextBottom?: number;
  noAllowOverlap?: boolean;
  /** Células criadas só por sprmTInsert (sem sprmTDefTable): posição final em finishTap. */
  insertBuilt?: boolean;
  /** Sombreamentos por célula (sprmTDefTableShd*, na ordem de prioridade). */
  shdRaw?: (Shd | undefined)[];
  shdDef?: (Shd | undefined)[];
  shd80?: (Shd | undefined)[];
}

export function newTc(): Tc {
  return {
    horzMerge: 0, vertMerge: 0, vertAlign: 0, textFlow: 0, ftsWidth: 0, wWidth: 0,
    fitText: false, noWrap: false, hideMark: false,
    brcSet: { top: false, left: false, bottom: false, right: false }, mar: {},
  };
}

export function newTap(): Tap {
  return { borders: {}, bordersSet: false, centers: [], tcs: [], padding: {} };
}

function readTc80(r: Prl['r'], o: number): Tc {
  const tc = newTc();
  const grf = r.u16(o);
  tc.horzMerge = grf & 3;
  tc.textFlow = (grf >> 2) & 7;
  tc.vertMerge = (grf >> 5) & 3;
  tc.vertAlign = (grf >> 7) & 3;
  tc.ftsWidth = (grf >> 9) & 7;
  tc.fitText = (grf & 0x1000) !== 0;
  tc.noWrap = (grf & 0x2000) !== 0;
  tc.hideMark = (grf & 0x4000) !== 0;
  tc.wWidth = r.i16(o + 2);
  const sides = ['brcTop', 'brcLeft', 'brcBottom', 'brcRight'] as const;
  const keys = ['top', 'left', 'bottom', 'right'] as const;
  // brcType 0 no TC80 = herda as bordas da linha/tabela (o Word 2000+ grava assim)
  sides.forEach((s, i) => {
    const b = brc80(r, o + 4 + i * 4);
    if (b && b.type !== 0) { tc[s] = b; tc.brcSet[keys[i]!] = true; }
  });
  return tc;
}

/** Itera itcFirst..itcLim limitado ao número de células. */
function forCells(tap: Tap, first: number, lim: number, fn: (tc: Tc, i: number) => void): void {
  for (let i = first; i < Math.min(lim, tap.tcs.length); i++) fn(tap.tcs[i]!, i);
}

function shdArray(p: Prl, size: number, read: (o: number) => Shd): (Shd | undefined)[] {
  const out: (Shd | undefined)[] = [];
  for (let o = p.op; o + size <= p.op + p.len; o += size) out.push(read(o));
  return out;
}

/** Fecha a TAP: linhas montadas por sprmTInsert começam em dxaLeft - dxaGapHalf. */
export function finishTap(tap: Tap): void {
  if (tap.insertBuilt && tap.centers.length) {
    const shift = (tap.dxaLeft ?? 0) - (tap.dxaGapHalf ?? 0) - tap.centers[0]!;
    if (shift) tap.centers = tap.centers.map((c) => c + shift);
  }
}

export function applyTap(tap: Tap, p: Prl): void {
  const r = p.r;
  switch (p.sprm) {
    case 0x5400: case 0x548a: tap.jc = opU16(p); break;
    case 0x9601: tap.dxaLeft = opI16(p); break;
    case 0x9602: tap.dxaGapHalf = opI16(p); break;
    // sprmTFCantSplit90 (0x3403) deve ser ignorado em favor de sprmTFCantSplit (medido no Word)
    case 0x3466: tap.cantSplit = opU8(p) !== 0; break;
    case 0x3404: tap.header = opU8(p) !== 0; break;
    case 0xd605: { // sprmTTableBorders80: 6 × Brc80 (operando com cb)
      const sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const;
      sides.forEach((s, i) => { tap.borders[s] = brc80(r, p.op + i * 4) ?? undefined; });
      tap.bordersSet = true;
      break;
    }
    case 0xd613: {
      const sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const;
      sides.forEach((s, i) => { tap.borders[s] = brcNew(r, p.op + i * 8) ?? undefined; });
      tap.bordersSet = true;
      break;
    }
    case 0x9407: tap.rowHeight = opI16(p); break;
    case 0xd608: case 0xd606: { // sprmTDefTable
      const n = r.u8(p.op);
      const centers: number[] = [];
      for (let i = 0; i <= n; i++) centers.push(r.i16(p.op + 1 + i * 2));
      const tcStart = p.op + 1 + (n + 1) * 2;
      const tcs: Tc[] = [];
      for (let i = 0; i < n; i++) {
        const o = tcStart + i * 20;
        tcs.push(o + 20 <= p.op + p.len ? readTc80(r, o) : newTc());
      }
      tap.centers = centers;
      tap.tcs = tcs;
      tap.insertBuilt = false;
      break;
    }
    case 0xd609: tap.shd80 = shdArray(p, 2, (o) => shd80(r.u16(o))); break;
    case 0xd612: tap.shdDef = [...shdArray(p, 10, (o) => shdNew(r, o))]; break;
    case 0xd616: tap.shdDef = [...(tap.shdDef ?? []).slice(0, 22), ...shdArray(p, 10, (o) => shdNew(r, o))]; break;
    case 0xd60c: tap.shdDef = [...(tap.shdDef ?? []).slice(0, 44), ...shdArray(p, 10, (o) => shdNew(r, o))]; break;
    case 0xd670: tap.shdRaw = [...shdArray(p, 10, (o) => shdNew(r, o))]; break;
    case 0xd671: tap.shdRaw = [...(tap.shdRaw ?? []).slice(0, 22), ...shdArray(p, 10, (o) => shdNew(r, o))]; break;
    case 0xd672: tap.shdRaw = [...(tap.shdRaw ?? []).slice(0, 44), ...shdArray(p, 10, (o) => shdNew(r, o))]; break;
    case 0x740a: tap.tlp = { itl: r.i16(p.op), grfatl: r.u16(p.op + 2) }; break;
    case 0x560b: case 0x5664: tap.bidi = opU16(p) !== 0; break;
    case 0x360d: tap.pc = opU8(p); break;
    case 0x940e: tap.dxaAbs = opI16(p); break;
    case 0x940f: tap.dyaAbs = opI16(p); break;
    case 0x9410: tap.dxaFromText = opI16(p); break;
    case 0x9411: tap.dyaFromText = opI16(p); break;
    case 0x941e: tap.dxaFromTextRight = opI16(p); break;
    case 0x941f: tap.dyaFromTextBottom = opI16(p); break;
    case 0x3465: tap.noAllowOverlap = opU8(p) !== 0; break;
    case 0xf614: tap.tableWidth = { fts: r.u8(p.op), w: r.i16(p.op + 1) }; break;
    case 0xf617: tap.widthBefore = { fts: r.u8(p.op), w: r.i16(p.op + 1) }; break;
    case 0xf618: tap.widthAfter = { fts: r.u8(p.op), w: r.i16(p.op + 1) }; break;
    case 0xf661: tap.widthIndent = { fts: r.u8(p.op), w: r.i16(p.op + 1) }; break;
    case 0x3615: tap.autofit = opU8(p) !== 0; break;
    case 0x563a: tap.istd = opU16(p); break;
    case 0xd660: tap.shdTable = shdNew(r, p.op); break;
    case 0x7621: { // sprmTInsert: itcInsert, ctc, dxaCol
      const itc = r.u8(p.op), ctc = r.u8(p.op + 1), dxa = r.i16(p.op + 2);
      if (!tap.centers.length) { tap.centers = [0]; tap.insertBuilt = true; }
      for (let k = 0; k < ctc; k++) {
        const at = Math.min(itc + k, tap.tcs.length);
        tap.tcs.splice(at, 0, newTc());
        const left = tap.centers[at] ?? tap.centers[tap.centers.length - 1]!;
        tap.centers.splice(at + 1, 0, left + dxa);
        for (let j = at + 2; j < tap.centers.length; j++) tap.centers[j]! += dxa;
      }
      break;
    }
    case 0x5622: { // sprmTDelete
      const first = r.u8(p.op), lim = r.u8(p.op + 1);
      const cnt = Math.max(0, Math.min(lim, tap.tcs.length) - first);
      if (cnt > 0 && tap.tcs.length - cnt >= 1) {
        const w = (tap.centers[first + cnt] ?? 0) - (tap.centers[first] ?? 0);
        tap.tcs.splice(first, cnt);
        tap.centers.splice(first + 1, cnt);
        for (let j = first + 1; j < tap.centers.length; j++) tap.centers[j]! -= w;
      }
      break;
    }
    case 0x7623: { // sprmTDxaCol: itcFirst, itcLim, dxaCol
      const first = r.u8(p.op), lim = r.u8(p.op + 1), dxa = r.i16(p.op + 2);
      for (let i = first; i < Math.min(lim, tap.tcs.length); i++) {
        const delta = dxa - ((tap.centers[i + 1] ?? 0) - (tap.centers[i] ?? 0));
        for (let j = i + 1; j < tap.centers.length; j++) tap.centers[j]! += delta;
      }
      break;
    }
    case 0x5624: { // sprmTMerge
      const first = r.u8(p.op), lim = r.u8(p.op + 1);
      forCells(tap, first, lim, (tc, i) => { tc.horzMerge = i === first ? 3 : 1; });
      break;
    }
    case 0x5625: { const first = r.u8(p.op), lim = r.u8(p.op + 1); forCells(tap, first, lim, (tc) => { tc.horzMerge = 0; }); break; }
    case 0xd620: case 0xd62f: { // sprmTSetBrc80 / sprmTSetBrc: cb, itcFirst, itcLim, bordersToApply, brc
      const first = r.u8(p.op), lim = r.u8(p.op + 1), which = r.u8(p.op + 2);
      const b = p.sprm === 0xd620 ? brc80(r, p.op + 3) : brcNew(r, p.op + 3);
      forCells(tap, first, lim, (tc) => {
        if (which & 1) { tc.brcTop = b; tc.brcSet.top = true; }
        if (which & 2) { tc.brcLeft = b; tc.brcSet.left = true; }
        if (which & 4) { tc.brcBottom = b; tc.brcSet.bottom = true; }
        if (which & 8) { tc.brcRight = b; tc.brcSet.right = true; }
      });
      break;
    }
    case 0x7629: { // sprmTTextFlow: itcFirst, itcLim, grpfTFlow (u16)
      const first = r.u8(p.op), lim = r.u8(p.op + 1), flow = r.u16(p.op + 2);
      forCells(tap, first, lim, (tc) => { tc.textFlow = flow & 7; });
      break;
    }
    case 0xd62b: { // sprmTVertMerge: itc, vertMergeFlags
      const itc = r.u8(p.op), v = r.u8(p.op + 1);
      if (tap.tcs[itc]) tap.tcs[itc]!.vertMerge = v;
      break;
    }
    case 0xd62c: { // sprmTVertAlign: itcFirst, itcLim, va
      const first = r.u8(p.op), lim = r.u8(p.op + 1), va = r.u8(p.op + 2);
      forCells(tap, first, lim, (tc) => { tc.vertAlign = va; });
      break;
    }
    case 0xd62d: case 0xd62e: { // sprmTSetShd/Odd (TableShadeOperand: itcFirst, itcLim, shd)
      const first = r.u8(p.op), lim = r.u8(p.op + 1);
      const s = shdNew(r, p.op + 2);
      forCells(tap, first, lim, (tc, i) => { if (p.sprm === 0xd62d || (i - first) % 2 === 0) tc.shd = s; });
      break;
    }
    case 0xd632: case 0xd634: case 0xd633: { // CSSA: itcFirst, itcLim, grfbrc, ftsWidth, wWidth
      const first = r.u8(p.op), lim = r.u8(p.op + 1), grf = r.u8(p.op + 2), fts = r.u8(p.op + 3), w = r.i16(p.op + 4);
      if (p.sprm === 0xd633) { if (fts === 3 || fts === 0x13) tap.spacing = w; break; }
      const set = (m: Tap['padding'] | Tc['mar']): void => {
        // ftsNil com largura 0 = margem zero (o Word grava 0 no .docx)
        const v = w;
        if (grf & 1) m.top = v;
        if (grf & 2) m.left = v;
        if (grf & 4) m.bottom = v;
        if (grf & 8) m.right = v;
      };
      if (p.sprm === 0xd634) set(tap.padding);
      else forCells(tap, first, lim, (tc) => set(tc.mar));
      break;
    }
    case 0xd635: { // sprmTCellWidth: itcFirst, itcLim, ftsWidth, wWidth
      const first = r.u8(p.op), lim = r.u8(p.op + 1), fts = r.u8(p.op + 2), w = r.i16(p.op + 3);
      forCells(tap, first, lim, (tc) => { tc.ftsWidth = fts; tc.wWidth = w; });
      break;
    }
    case 0xd642: { // sprmTCellFHideMark: itcFirst, itcLim, fHideMark
      const first = r.u8(p.op), lim = r.u8(p.op + 1), v = r.u8(p.op + 2);
      forCells(tap, first, lim, (tc) => { tc.hideMark = v !== 0; });
      break;
    }
    case 0xd639: { // sprmTFCellNoWrap
      const first = r.u8(p.op), lim = r.u8(p.op + 1), v = r.u8(p.op + 2);
      forCells(tap, first, lim, (tc) => { tc.noWrap = v !== 0; });
      break;
    }
  }
}

// ───────────────────────────── seção ─────────────────────────────

export interface Sep {
  bkc: number;
  titlePage: boolean;
  ccolM1: number;
  dxaColumns: number;
  evenlySpaced: boolean;
  colWidths: number[];
  colSpacings: number[];
  lBetween: boolean;
  xaPage: number;
  yaPage: number;
  /** 1 retrato, 2 paisagem. */
  orientation: number;
  dxaLeft: number;
  dxaRight: number;
  dyaTop: number;
  dyaBottom: number;
  dzaGutter: number;
  dyaHdrTop: number;
  dyaHdrBottom: number;
  nfcPgn: number;
  pgnRestart: boolean;
  pgnStart: number;
  vjc: number;
  lnnMod: number;
  dxaLnn: number;
  lnc: number;
  lnnMin: number;
  brcTop?: Brc; brcLeft?: Brc; brcBottom?: Brc; brcRight?: Brc;
  pgbProp: number;
  clm: number;
  dyaLinePitch?: number;
  dxtCharSpace: number;
  textFlow: number;
  bidi: boolean;
  rtlGutter: boolean;
  fpc?: number; rncFtn?: number; nFtn?: number; nfcFtnRef?: number;
  rncEdn?: number; nEdn?: number; nfcEdnRef?: number;
  fEndnote: boolean;
  dmBinFirst: number;
  dmBinOther: number;
  dmPaperReq?: number;
  protectedSec?: boolean;
  cnsPgn?: number;
  headingPgn?: number;
}

export function defaultSep(): Sep {
  return {
    bkc: 2, titlePage: false, ccolM1: 0, dxaColumns: 720, evenlySpaced: true, colWidths: [], colSpacings: [], lBetween: false,
    xaPage: 12240, yaPage: 15840, orientation: 1, dxaLeft: 1800, dxaRight: 1800, dyaTop: 1440, dyaBottom: 1440, dzaGutter: 0,
    dyaHdrTop: 720, dyaHdrBottom: 720, nfcPgn: 0, pgnRestart: false, pgnStart: 1, vjc: 0, lnnMod: 0, dxaLnn: 0, lnc: 0, lnnMin: 0,
    pgbProp: 0, clm: 0, dxtCharSpace: 0, textFlow: 0, bidi: false, rtlGutter: false, fEndnote: true, dmBinFirst: 0, dmBinOther: 0,
  };
}

export function applySep(sep: Sep, p: Prl): void {
  const r = p.r;
  switch (p.sprm) {
    case 0x3000: sep.cnsPgn = opU8(p); break;
    case 0x3001: sep.headingPgn = opU8(p); break;
    case 0xf203: { const i = r.u8(p.op); sep.colWidths[i] = r.i16(p.op + 1); break; }
    case 0xf204: { const i = r.u8(p.op); sep.colSpacings[i] = r.i16(p.op + 1); break; }
    case 0x3005: sep.evenlySpaced = opU8(p) !== 0; break;
    case 0x3006: sep.protectedSec = opU8(p) !== 0; break;
    case 0x5007: sep.dmBinFirst = opU16(p); break;
    case 0x5008: sep.dmBinOther = opU16(p); break;
    case 0x5026: sep.dmPaperReq = opU16(p); break;
    case 0x3009: sep.bkc = opU8(p); break;
    case 0x300a: sep.titlePage = opU8(p) !== 0; break;
    case 0x500b: sep.ccolM1 = opU16(p); break;
    case 0x900c: sep.dxaColumns = opI16(p); break;
    case 0x300e: sep.nfcPgn = opU8(p); break;
    case 0x3011: sep.pgnRestart = opU8(p) !== 0; break;
    case 0x3012: sep.fEndnote = opU8(p) !== 0; break;
    case 0x3013: sep.lnc = opU8(p); break;
    case 0x5015: sep.lnnMod = opU16(p); break;
    case 0x9016: sep.dxaLnn = opI16(p); break;
    case 0xb017: sep.dyaHdrTop = opU16(p); break;
    case 0xb018: sep.dyaHdrBottom = opU16(p); break;
    case 0x3019: sep.lBetween = opU8(p) !== 0; break;
    case 0x301a: sep.vjc = opU8(p); break;
    case 0x501b: sep.lnnMin = opU16(p); break;
    case 0x501c: sep.pgnStart = opU16(p); break;
    case 0x7044: sep.pgnStart = opU32(p); break;
    case 0x301d: sep.orientation = opU8(p); break;
    case 0xb01f: sep.xaPage = opU16(p); break;
    case 0xb020: sep.yaPage = opU16(p); break;
    case 0xb021: sep.dxaLeft = opU16(p); break;
    case 0xb022: sep.dxaRight = opU16(p); break;
    case 0x9023: sep.dyaTop = opI16(p); break;
    case 0x9024: sep.dyaBottom = opI16(p); break;
    case 0xb025: sep.dzaGutter = opU16(p); break;
    case 0x3228: sep.bidi = opU8(p) !== 0; break;
    case 0x322a: sep.rtlGutter = opU8(p) !== 0; break;
    case 0x702b: sep.brcTop = brc80(r, p.op); break;
    case 0x702c: sep.brcLeft = brc80(r, p.op); break;
    case 0x702d: sep.brcBottom = brc80(r, p.op); break;
    case 0x702e: sep.brcRight = brc80(r, p.op); break;
    case 0xd234: sep.brcTop = brcNew(r, p.op); break;
    case 0xd235: sep.brcLeft = brcNew(r, p.op); break;
    case 0xd236: sep.brcBottom = brcNew(r, p.op); break;
    case 0xd237: sep.brcRight = brcNew(r, p.op); break;
    case 0x522f: sep.pgbProp = opU16(p); break;
    case 0x7030: sep.dxtCharSpace = opI32(p); break;
    case 0x9031: sep.dyaLinePitch = opI16(p); break;
    case 0x5032: sep.clm = opU16(p); break;
    case 0x5033: sep.textFlow = opU16(p); break;
    case 0x303b: sep.fpc = opU8(p); break;
    case 0x303c: sep.rncFtn = opU8(p); break;
    case 0x303e: sep.rncEdn = opU8(p); break;
    case 0x503f: sep.nFtn = opU16(p); break;
    case 0x5040: sep.nfcFtnRef = opU16(p); break;
    case 0x5041: sep.nEdn = opU16(p); break;
    case 0x5042: sep.nfcEdnRef = opU16(p); break;
  }
}

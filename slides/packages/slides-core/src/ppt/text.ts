/**
 * Texto do PowerPoint binário ([MS-PPT] 2.9): exceções de formatação de
 * parágrafo (TextPFException) e de caractere (TextCFException), corridas do
 * StyleTextPropAtom, régua (TextRulerAtom), estilos-mestre
 * (TextMasterStyleAtom) e a extensão PP9 (numeração automática).
 *
 * Toda estrutura é "máscara + campos opcionais na ordem da spec": cada parser
 * devolve o número de bytes consumidos — o chamador confere com o tamanho do
 * registro (corrida que não fecha = arquivo corrompido ou campo desconhecido).
 */
import { ByteReader, type Rec, children, utf16, latin1, RT } from './records.js';

/** Cor de texto/marcador: RGB direto (index 0xFE) ou índice do esquema (0..7). */
export interface ColorIndex { r: number; g: number; b: number; index: number }

export interface TabStop { pos: number; type: number }

/** Propriedades de parágrafo (TextPFException). Ausente = herdado. */
export interface TextPF {
  hasBullet?: boolean;
  bulletHasFont?: boolean;
  bulletHasColor?: boolean;
  bulletHasSize?: boolean;
  bulletChar?: number;
  bulletFont?: number;
  /** 25..400 = % do texto; negativo = pontos absolutos (−N). */
  bulletSize?: number;
  bulletColor?: ColorIndex;
  /** 0 esq, 1 centro, 2 dir, 3 justif., 4 distribuído, 5 thai, 6 justifyLow. */
  align?: number;
  /** ≥ 0: % da linha; < 0: −mestre-unidades (1/576"). */
  lineSpacing?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  /** Início do texto (mestre-unidades, absoluto à esquerda da caixa). */
  leftMargin?: number;
  /** Posição do marcador/1ª linha (mestre-unidades, absoluto). */
  indent?: number;
  defaultTabSize?: number;
  tabStops?: TabStop[];
  fontAlign?: number;
  wrapFlags?: number;
  textDirection?: number;
  /** PP9: numeração automática (TextAutoNumberScheme). */
  autoNumScheme?: number;
  autoNumStart?: number;
  /** PP9: índice do marcador de IMAGEM na BlipCollection9 do documento (−1 = nenhum). */
  bulletBlipRef?: number;
  hasAutoNum?: boolean;
}

/** Propriedades de caractere (TextCFException). Ausente = herdado. */
export interface TextCF {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  shadow?: boolean;
  emboss?: boolean;
  font?: number;
  eaFont?: number;
  ansiFont?: number;
  symbolFont?: number;
  /** Pontos. */
  size?: number;
  color?: ColorIndex;
  /** Sobrescrito/subscrito: % (−100..100). */
  position?: number;
  /** Índice no StyleTextProp9Atom (extensão PP9 do parágrafo/corrida). */
  pp9rt?: number;
}

export interface PFRun { count: number; indentLevel: number; pf: TextPF }
export interface CFRun { count: number; cf: TextCF }

/** Régua do texto (TextRulerAtom): margens por nível (mestre-unidades). */
export interface TextRuler {
  defaultTabSize?: number;
  cLevels?: number;
  tabStops?: TabStop[];
  leftMargin: (number | undefined)[];
  indent: (number | undefined)[];
}

/** Bloco de texto de uma forma (ClientTextbox) ou do SlideListWithText. */
export interface TextBlock {
  /** TextHeaderAtom.textType: 0 título, 1 corpo, 2 notas, 4 outro, 5 corpo-central, 6 título-central, 7 meio-corpo, 8 quarto-corpo. */
  textType: number;
  text: string;
  pfRuns: PFRun[];
  cfRuns: CFRun[];
  ruler?: TextRuler;
  /** Exceções PP9 por parágrafo (StyleTextProp9Atom), na ordem dos parágrafos. */
  pf9?: TextPF[];
  /** Campos (data/nº do slide) por posição de caractere: tipo do meta-char. */
  metaChars?: { pos: number; type: number }[];
  /** Faixas com ação de clique (InteractiveInfo + TextInteractiveInfoAtom). */
  links?: TextLink[];
}

/** Ação de clique numa faixa de texto ([start, end) em caracteres). */
export interface TextLink {
  start: number;
  end: number;
  /** InteractiveInfoAtom.exHyperlinkIdRef. */
  hyperlinkId: number;
  /** 4 = hiperlink; 3 = salto (jump: 1 próximo, 2 anterior, 3 primeiro, 4 último…). */
  action: number;
  jump: number;
}

/** Um nível do estilo-mestre (TextMasterStyleLevel). */
export interface MasterStyleLevel { level?: number; pf: TextPF; cf: TextCF }

const readColorIndex = (r: ByteReader, o: number): ColorIndex =>
  ({ r: r.u8(o), g: r.u8(o + 1), b: r.u8(o + 2), index: r.u8(o + 3) });

/** Máximo de paradas de tabulação aceitas (contagens corrompidas multiplicariam a saída). */
const MAX_TABS = 64;

function readTabStops(r: ByteReader, o: number): { tabs: TabStop[]; size: number } {
  const n = r.u16(o);
  const tabs: TabStop[] = [];
  for (let i = 0; i < Math.min(n, MAX_TABS); i++) tabs.push({ pos: r.i16(o + 2 + i * 4), type: r.u16(o + 4 + i * 4) });
  return { tabs, size: 2 + n * 4 };
}

/** TextPFException a partir de `o` (após a máscara já lida em `masks`). */
export function readPFFields(r: ByteReader, o: number, masks: number): { pf: TextPF; size: number } {
  const start = o;
  const pf: TextPF = {};
  if (masks & 0x0f) {
    const f = r.u16(o); o += 2;
    if (masks & 0x01) pf.hasBullet = (f & 1) !== 0;
    if (masks & 0x02) pf.bulletHasFont = (f & 2) !== 0;
    if (masks & 0x04) pf.bulletHasColor = (f & 4) !== 0;
    if (masks & 0x08) pf.bulletHasSize = (f & 8) !== 0;
  }
  if (masks & 0x80) { pf.bulletChar = r.u16(o); o += 2; }
  if (masks & 0x10) { pf.bulletFont = r.u16(o); o += 2; }
  if (masks & 0x40) { pf.bulletSize = r.i16(o); o += 2; }
  if (masks & 0x20) { pf.bulletColor = readColorIndex(r, o); o += 4; }
  if (masks & 0x800) { pf.align = r.u16(o); o += 2; }
  if (masks & 0x1000) { pf.lineSpacing = r.i16(o); o += 2; }
  if (masks & 0x2000) { pf.spaceBefore = r.i16(o); o += 2; }
  if (masks & 0x4000) { pf.spaceAfter = r.i16(o); o += 2; }
  if (masks & 0x100) { pf.leftMargin = r.i16(o); o += 2; }
  if (masks & 0x400) { pf.indent = r.i16(o); o += 2; }
  if (masks & 0x8000) { pf.defaultTabSize = r.i16(o); o += 2; }
  if (masks & 0x100000) { const t = readTabStops(r, o); pf.tabStops = t.tabs; o += t.size; }
  if (masks & 0x10000) { pf.fontAlign = r.u16(o); o += 2; }
  if (masks & 0xe0000) { pf.wrapFlags = r.u16(o); o += 2; }
  if (masks & 0x200000) { pf.textDirection = r.u16(o); o += 2; }
  return { pf, size: o - start };
}

/** Bits de estilo do CFMasks que exigem o campo fontStyle. */
const CF_STYLE_BITS = 0x0001 | 0x0002 | 0x0004 | 0x0010 | 0x0020 | 0x0080 | 0x0200 | 0x3c00;

/** TextCFException a partir de `o` (após a máscara já lida em `masks`). */
export function readCFFields(r: ByteReader, o: number, masks: number): { cf: TextCF; size: number } {
  const start = o;
  const cf: TextCF = {};
  if (masks & CF_STYLE_BITS) {
    const s = r.u16(o); o += 2;
    if (masks & 0x0001) cf.bold = (s & 0x0001) !== 0;
    if (masks & 0x0002) cf.italic = (s & 0x0002) !== 0;
    if (masks & 0x0004) cf.underline = (s & 0x0004) !== 0;
    if (masks & 0x0010) cf.shadow = (s & 0x0010) !== 0;
    if (masks & 0x0200) cf.emboss = (s & 0x0200) !== 0;
    if (masks & 0x3c00) cf.pp9rt = (s >> 10) & 0xf;
  }
  if (masks & 0x10000) { cf.font = r.u16(o); o += 2; }
  if (masks & 0x200000) { cf.eaFont = r.u16(o); o += 2; }
  if (masks & 0x400000) { cf.ansiFont = r.u16(o); o += 2; }
  if (masks & 0x800000) { cf.symbolFont = r.u16(o); o += 2; }
  if (masks & 0x20000) { cf.size = r.i16(o); o += 2; }
  if (masks & 0x40000) { cf.color = readColorIndex(r, o); o += 4; }
  if (masks & 0x80000) { cf.position = r.i16(o); o += 2; }
  return { cf, size: o - start };
}

/**
 * StyleTextPropAtom: corridas de parágrafo (cobrindo text.length + 1 — a marca
 * final implícita) seguidas das corridas de caractere.
 */
export function readStyleTextProp(rec: Rec, textLen: number): { pf: PFRun[]; cf: CFRun[]; ok: boolean; leftover: number } {
  const r = rec.r;
  let o = rec.start;
  const end = rec.end;
  const pf: PFRun[] = [];
  const cf: CFRun[] = [];
  let ok = true;
  let covered = 0;
  while (covered < textLen + 1 && o + 10 <= end) {
    const count = r.u32(o);
    const indentLevel = r.u16(o + 4);
    const masks = r.u32(o + 6);
    const { pf: p, size } = readPFFields(r, o + 10, masks);
    o += 10 + size;
    pf.push({ count, indentLevel, pf: p });
    covered += count;
    if (count === 0) { ok = false; break; }
  }
  covered = 0;
  while (covered < textLen + 1 && o + 8 <= end) {
    const count = r.u32(o);
    const masks = r.u32(o + 4);
    const { cf: c, size } = readCFFields(r, o + 8, masks);
    o += 8 + size;
    cf.push({ count, cf: c });
    covered += count;
    if (count === 0) { ok = false; break; }
  }
  if (o > end) ok = false;
  return { pf, cf, ok, leftover: end - o };
}

/** TextRulerAtom → TextRuler. */
export function readTextRuler(rec: Rec): TextRuler {
  const r = rec.r;
  let o = rec.start;
  const masks = r.u32(o); o += 4;
  const ruler: TextRuler = { leftMargin: [], indent: [] };
  if (masks & 0x2) { ruler.cLevels = r.i16(o); o += 2; }
  if (masks & 0x1) { ruler.defaultTabSize = r.i16(o); o += 2; }
  if (masks & 0x4) { const t = readTabStops(r, o); ruler.tabStops = t.tabs; o += t.size; }
  for (let lvl = 0; lvl < 5; lvl++) {
    if (masks & (0x8 << lvl)) { ruler.leftMargin[lvl] = r.i16(o); o += 2; }
    if (masks & (0x100 << lvl)) { ruler.indent[lvl] = r.i16(o); o += 2; }
  }
  return ruler;
}

/**
 * TextMasterStyleAtom → níveis (pf + cf). Instâncias ≥ 5 (corpo-central,
 * título-central, meio/quarto-corpo) trazem o nº do nível antes de cada um.
 */
export function readTextMasterStyle(rec: Rec): MasterStyleLevel[] {
  const r = rec.r;
  let o = rec.start;
  const n = r.u16(o); o += 2;
  const out: MasterStyleLevel[] = [];
  for (let i = 0; i < n && o < rec.end; i++) {
    let level: number | undefined;
    if (rec.inst >= 5) { level = r.u16(o); o += 2; }
    const pm = r.u32(o); o += 4;
    const p = readPFFields(r, o, pm); o += p.size;
    const cm = r.u32(o); o += 4;
    const c = readCFFields(r, o, cm); o += c.size;
    const lvl: MasterStyleLevel = { pf: p.pf, cf: c.cf };
    if (level !== undefined) lvl.level = level;
    out.push(lvl);
  }
  return out;
}

/** TextCFExceptionAtom (padrões de caractere do documento). */
export function readCFExceptionAtom(rec: Rec): TextCF {
  return readCFFields(rec.r, rec.start + 4, rec.r.u32(rec.start)).cf;
}

/** TextPFExceptionAtom (padrões de parágrafo do documento): 2 bytes reservados + exceção. */
export function readPFExceptionAtom(rec: Rec): TextPF {
  return readPFFields(rec.r, rec.start + 6, rec.r.u32(rec.start + 2)).pf;
}

/**
 * StyleTextProp9Atom (extensão PP9): por parágrafo, pf9 + cf9 + si. Do pf9 só
 * interessa a numeração automática (fBulletHasAutoNumber + esquema).
 */
export function readStyleTextProp9(rec: Rec): TextPF[] {
  const r = rec.r;
  let o = rec.start;
  const out: TextPF[] = [];
  while (o + 12 <= rec.end) {
    const pm = r.u32(o); o += 4;
    const pf: TextPF = {};
    if (pm & 0x800000) { pf.bulletBlipRef = r.i16(o); o += 2; } // marcador de imagem
    if (pm & 0x2000000) { pf.hasAutoNum = r.u16(o) !== 0; o += 2; }
    if (pm & 0x1000000) { pf.autoNumScheme = r.u16(o); pf.autoNumStart = r.i16(o + 2); o += 4; }
    const cm = r.u32(o); o += 4;
    // TextCFException9: pp10runid/unused (4 bits + 28) só com o bit pp10ext
    if (cm & 0x100000) o += 4;
    const sm = r.u32(o); o += 4;
    o += textSIExceptionSize(r, o, sm);
    out.push(pf);
  }
  return out;
}

/**
 * Tamanho dos campos de uma TextSIException (após a máscara), na ordem da
 * spec: spellInfo, lid, altLid, bidi, pp10 (4 bytes), smartTags (n + ids).
 */
function textSIExceptionSize(r: ByteReader, o: number, masks: number): number {
  let n = 0;
  if (masks & 0x1) n += 2;
  if (masks & 0x2) n += 2;
  if (masks & 0x4) n += 2;
  if (masks & 0x40) n += 2;
  if (masks & 0x20) n += 4;
  if (masks & 0x200) n += 4 + 4 * r.u32(o + n);
  return n;
}

/**
 * Monta um TextBlock a partir dos registros de texto consecutivos (filhos de
 * um ClientTextbox ou um trecho do SlideListWithText). `recs` começa no
 * TextHeaderAtom.
 */
export function readTextBlock(recs: Rec[]): TextBlock | undefined {
  const header = recs[0];
  if (!header || header.type !== RT.TextHeaderAtom) return undefined;
  const block: TextBlock = { textType: header.r.u32(header.start), text: '', pfRuns: [], cfRuns: [] };
  let style: Rec | undefined;
  let lastAction: { hyperlinkId: number; action: number; jump: number } | undefined;
  for (const rec of recs.slice(1)) {
    switch (rec.type) {
      case RT.InteractiveInfo: {
        // InteractiveInfoAtom: soundIdRef, exHyperlinkIdRef, action, oleVerb, jump, …
        const a = children(rec).find((k) => k.type === RT.InteractiveInfoAtom);
        lastAction = a && rec.inst === 0
          ? { hyperlinkId: a.r.u32(a.start + 4), action: a.r.u8(a.start + 8), jump: a.r.u8(a.start + 10) }
          : undefined;
        break;
      }
      case RT.TextInteractiveInfoAtom:
        if (rec.inst === 0 && lastAction) {
          (block.links ??= []).push({ start: rec.r.u32(rec.start), end: rec.r.u32(rec.start + 4), ...lastAction });
        }
        lastAction = undefined;
        break;
      case RT.TextCharsAtom: block.text = utf16(rec.r, rec.start, rec.end); break;
      case RT.TextBytesAtom: block.text = latin1(rec.r, rec.start, rec.end); break;
      case RT.StyleTextPropAtom: style = rec; break;
      case RT.TextRulerAtom: block.ruler = readTextRuler(rec); break;
      case RT.SlideNumberMetaCharAtom:
      case RT.DateTimeMetaCharAtom:
      case RT.GenericDateMetaCharAtom:
      case RT.HeaderMetaCharAtom:
      case RT.FooterMetaCharAtom:
      case RT.RtfDateTimeMetaCharAtom:
        (block.metaChars ??= []).push({ pos: rec.r.u32(rec.start), type: rec.type });
        break;
    }
  }
  if (style) {
    const st = readStyleTextProp(style, block.text.length);
    block.pfRuns = st.pf;
    block.cfRuns = st.cf;
  }
  return block;
}

/**
 * Divide uma lista de registros (ex.: filhos do SlideListWithText após cada
 * SlidePersistAtom, ou do ClientTextbox) em blocos que começam em
 * TextHeaderAtom.
 */
export function splitTextBlocks(recs: Rec[]): TextBlock[] {
  const out: TextBlock[] = [];
  let cur: Rec[] | undefined;
  for (const rec of recs) {
    if (rec.type === RT.TextHeaderAtom) {
      if (cur) { const b = readTextBlock(cur); if (b) out.push(b); }
      cur = [rec];
    } else if (cur) cur.push(rec);
  }
  if (cur) { const b = readTextBlock(cur); if (b) out.push(b); }
  return out;
}

/** Filhos de texto de um ClientTextbox → bloco (ou referência ao outline). */
export function readClientTextbox(rec: Rec): { block?: TextBlock; outlineRef?: number; ruler?: TextRuler } {
  const kids = children(rec);
  const ref = kids.find((k) => k.type === RT.OutlineTextRefAtom);
  if (ref) {
    // texto do outline (SlideListWithText), mas a RÉGUA pode estar na própria forma
    // (margens/recuos/tabulações do placeholder — o app usa esta)
    const r = kids.find((k) => k.type === RT.TextRulerAtom);
    return r ? { outlineRef: ref.r.u32(ref.start), ruler: readTextRuler(r) } : { outlineRef: ref.r.u32(ref.start) };
  }
  const blocks = splitTextBlocks(kids);
  return blocks[0] ? { block: blocks[0] } : {};
}

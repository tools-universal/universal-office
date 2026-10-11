/**
 * Leitor do .doc: abre o Compound File, valida o FIB e monta o contexto com
 * todas as estruturas (texto, FKPs, estilos, fontes, listas, seções, notas,
 * cabeçalhos, desenhos). A conversão para OOXML fica em docx-writer.ts.
 */
import { ByteReader, OA, children, readRec, recsIn } from './bytes.js';
import { readCfb, type CfbFile } from './cfb.js';
import { DocFormatError, FC, readFib, type Fib } from './fib.js';
import { readChpxRuns, readPapxRuns, readPlc, runAt, type FcRun } from './fkp.js';
import { readFonts, type DocFont } from './fonts.js';
import { readLists, type Lists } from './lists.js';
import { applyMasters, indexDrawing, readBStore, type BseEntry, type OAShape } from './officeart.js';
import { applySep, defaultSep, type Sep } from './props.js';
import { prls } from './sprm.js';
import { readStsh, StyleResolver, type StyleSheet } from './stsh.js';
import { decodeText, pieceAt, readPieceTable, type Piece, type PieceTable } from './text.js';

export interface Section {
  cpStart: number;
  cpEnd: number;
  sep: Sep;
}

export interface Note {
  /** CP da referência no texto principal. */
  refCp: number;
  /** Numeração automática (FRD.nAuto > 0) ou marca personalizada. */
  auto: boolean;
  /** Faixa do texto da nota (CPs absolutos). */
  cpStart: number;
  cpEnd: number;
}

export interface Comment {
  refCp: number;
  cpStart: number;
  cpEnd: number;
  author: string;
  initials: string;
  /** Faixa comentada (bookmark de anotação), se houver. */
  rangeStart?: number;
  rangeEnd?: number;
  dttm?: number;
}

export interface Bookmark {
  name: string;
  cpStart: number;
  cpEnd: number;
}

export interface Fspa {
  cp: number;
  spid: number;
  xaLeft: number;
  yaTop: number;
  xaRight: number;
  yaBottom: number;
  bx: number;
  by: number;
  wr: number;
  wrk: number;
  belowText: boolean;
  anchorLock: boolean;
}

export interface TxbxStory {
  spid: number;
  cpStart: number;
  cpEnd: number;
}

/** Subdocumentos: início (CP) de cada história no texto completo. */
export interface Subdocs {
  main: [number, number];
  ftn: [number, number];
  hdd: [number, number];
  atn: [number, number];
  edn: [number, number];
  txbx: [number, number];
  hdrTxbx: [number, number];
}

export class DocReader {
  readonly cfb: CfbFile;
  readonly fib: Fib;
  readonly word: Uint8Array;
  readonly table: Uint8Array;
  readonly data?: Uint8Array;
  readonly pt: PieceTable;
  readonly text: string;
  readonly chpx: FcRun[];
  readonly papx: FcRun[];
  readonly stsh: StyleSheet;
  readonly styles: StyleResolver;
  readonly fonts: DocFont[];
  readonly lists: Lists;
  readonly sub: Subdocs;
  readonly sections: Section[];
  readonly dop: Uint8Array;
  /** Orçamento de descompressão de imagens deste documento (bombas zlib). */
  readonly blipBudget = { left: 512 * 1024 * 1024 };
  private shapesMain?: Map<number, OAShape>;
  private shapesHdr?: Map<number, OAShape>;
  private bstore?: (BseEntry | undefined)[];

  constructor(bytes: Uint8Array) {
    let cfb: CfbFile;
    try { cfb = readCfb(bytes); } catch (e) {
      throw new DocFormatError(`Arquivo .doc corrompido: ${(e as Error).message}`);
    }
    this.cfb = cfb;
    if (cfb.has('EncryptionInfo') || cfb.has('EncryptedPackage')) {
      throw new DocFormatError('O documento está protegido por senha (criptografado) e não pode ser aberto.');
    }
    const word = cfb.getStream('WordDocument');
    if (!word) throw new DocFormatError('O arquivo não é um documento do Word (.doc): stream WordDocument ausente.');
    this.word = word;
    if (word.length >= 4) {
      const w = new ByteReader(word);
      const ident = w.u16(0);
      const nFib = w.u16(2);
      if (ident === 0xa5ec || ident === 0xa5dc) {
        if (nFib < 0x00c1 && nFib !== 0) {
          throw new DocFormatError('Documento de uma versão anterior ao Word 97 (Word 6/95) — formato não suportado. Abra e salve no Word como .docx.');
        }
      }
    }
    const fib = readFib(word);
    this.fib = fib;
    if (fib.nFib < 0x00c1) {
      throw new DocFormatError('Documento de uma versão anterior ao Word 97 (Word 6/95) — formato não suportado. Abra e salve no Word como .docx.');
    }
    if (fib.fEncrypted) {
      throw new DocFormatError(fib.fObfuscated
        ? 'O documento está protegido por senha (ofuscação XOR) e não pode ser aberto.'
        : 'O documento está protegido por senha (criptografado) e não pode ser aberto.');
    }
    const table = cfb.getStream(fib.fWhichTblStm ? '1Table' : '0Table');
    if (!table) throw new DocFormatError(`Arquivo .doc corrompido: stream ${fib.fWhichTblStm ? '1Table' : '0Table'} ausente.`);
    this.table = table;
    this.data = cfb.getStream('Data');
    this.pt = readPieceTable(fib, table);
    const c = [fib.ccpText, fib.ccpFtn, fib.ccpHdd, fib.ccpMcr, fib.ccpAtn, fib.ccpEdn, fib.ccpTxbx, fib.ccpHdrTxbx].map((v) => Math.max(0, v));
    let at = 0;
    const span = (n: number): [number, number] => { const s: [number, number] = [at, at + n]; at += n; return s; };
    const main = span(c[0]!), ftn = span(c[1]!), hdd = span(c[2]!);
    span(c[3]!);
    const atn = span(c[4]!), edn = span(c[5]!), txbx = span(c[6]!), hdrTxbx = span(c[7]!);
    this.sub = { main, ftn, hdd, atn, edn, txbx, hdrTxbx };
    const lastPieceCp = this.pt.pieces.length ? this.pt.pieces[this.pt.pieces.length - 1]!.cpEnd : 0;
    // subdocumentos não vazios têm um parágrafo final extra (coberto pelas peças)
    const totalCp = Math.max(at, Math.min(lastPieceCp, at + 1));
    this.text = decodeText(this.pt, word, totalCp);
    this.chpx = readChpxRuns(fib, table, word);
    this.papx = readPapxRuns(fib, table, word, this.data);
    this.stsh = readStsh(fib, table);
    this.styles = new StyleResolver(this.stsh);
    this.fonts = readFonts(fib, table);
    this.lists = readLists(fib, table);
    this.sections = this.readSections();
    const dop = fib.fcLcb(FC.Dop);
    this.dop = dop.lcb && dop.fc + dop.lcb <= table.length ? table.subarray(dop.fc, dop.fc + dop.lcb) : new Uint8Array(0);
  }

  get pieces(): Piece[] { return this.pt.pieces; }

  /** grpprl do Prm de uma peça (salvamento rápido). */
  prmGrpprl(piece: Piece): Uint8Array | undefined {
    const prm = piece.prm;
    if (prm & 1) return this.pt.prcs[prm >> 1];
    return undefined; // Prm0 (sprm único comprimido) não é gerado pelo Word 97+
  }

  /** FC do CP e a peça. */
  fcAt(cp: number): { fc: number; piece: Piece } | undefined {
    const i = pieceAt(this.pt.pieces, cp);
    if (i < 0) return undefined;
    const p = this.pt.pieces[i]!;
    return { fc: p.fc + (cp - p.cpStart) * (p.compressed ? 1 : 2), piece: p };
  }

  /**
   * Fim do parágrafo que contém `cp` ([MS-DOC] 2.4.2): acha a faixa PAPX do FC;
   * se termina dentro da peça, o parágrafo acaba ali; senão segue na peça seguinte.
   */
  paragraphAt(cp: number, limit: number): { end: number; run?: FcRun; piece?: Piece } {
    let cur = cp;
    let guard = 0;
    while (cur < limit && guard++ < 100000) {
      const i = pieceAt(this.pt.pieces, cur);
      if (i < 0) return { end: limit };
      const p = this.pt.pieces[i]!;
      const cs = p.compressed ? 1 : 2;
      const fc = p.fc + (cur - p.cpStart) * cs;
      const run = runAt(this.papx, fc);
      const pieceFcEnd = p.fc + (p.cpEnd - p.cpStart) * cs;
      if (run && run.fcEnd <= pieceFcEnd && run.fcEnd > fc) {
        const end = p.cpStart + Math.ceil((run.fcEnd - p.fc) / cs);
        if (end > limit) return { end: limit, run, piece: p };
        return { end, run, piece: p };
      }
      cur = p.cpEnd;
    }
    return { end: limit };
  }

  // ───────────────────────────── seções ─────────────────────────────

  private readSections(): Section[] {
    const { fc, lcb } = this.fib.fcLcb(FC.PlcfSed);
    const plc = readPlc(this.table, fc, lcb, 12);
    const out: Section[] = [];
    const w = new ByteReader(this.word);
    const mainEnd = this.sub.main[1];
    if (plc) {
      for (let i = 0; i < plc.n; i++) {
        const sep = defaultSep();
        const fcSepx = plc.r.u32(plc.dataAt(i) + 2);
        if (fcSepx !== 0xffffffff && fcSepx + 2 <= this.word.length) {
          const cb = w.i16(fcSepx);
          const grpprl = w.sub(fcSepx + 2, fcSepx + 2 + Math.max(0, cb));
          for (const p of prls(grpprl)) applySep(sep, p);
        }
        const cpStart = Math.min(plc.cps[i]!, mainEnd);
        const cpEnd = Math.min(plc.cps[i + 1]!, mainEnd);
        if (cpEnd > cpStart || out.length === 0) out.push({ cpStart, cpEnd, sep });
      }
    }
    if (!out.length) out.push({ cpStart: 0, cpEnd: mainEnd, sep: defaultSep() });
    out[out.length - 1]!.cpEnd = mainEnd;
    return out;
  }

  // ───────────────────────────── cabeçalhos ─────────────────────────────

  /** Histórias de cabeçalho/rodapé: [início, fim) absolutos, por índice do Plcfhdd. */
  headerStories(): ([number, number] | undefined)[] {
    const { fc, lcb } = this.fib.fcLcb(FC.PlcfHdd);
    const plc = readPlc(this.table, fc, lcb, 0);
    if (!plc || !this.fib.ccpHdd) return [];
    const base = this.sub.hdd[0];
    const out: ([number, number] | undefined)[] = [];
    // o último CP é indefinido; o penúltimo só fecha a última história
    for (let i = 0; i < plc.cps.length - 2; i++) {
      const a = plc.cps[i]!, b = plc.cps[i + 1]!;
      out.push(b > a && b <= this.fib.ccpHdd ? [base + a, base + b] : undefined);
    }
    return out;
  }

  // ───────────────────────────── notas ─────────────────────────────

  notes(kind: 'ftn' | 'edn'): Note[] {
    const refIdx = kind === 'ftn' ? FC.PlcffndRef : FC.PlcfendRef;
    const txtIdx = kind === 'ftn' ? FC.PlcffndTxt : FC.PlcfendTxt;
    const ref = this.fib.fcLcb(refIdx);
    const txt = this.fib.fcLcb(txtIdx);
    const refPlc = readPlc(this.table, ref.fc, ref.lcb, 2);
    const txtPlc = readPlc(this.table, txt.fc, txt.lcb, 0);
    if (!refPlc || !txtPlc) return [];
    const base = (kind === 'ftn' ? this.sub.ftn : this.sub.edn)[0];
    const out: Note[] = [];
    for (let i = 0; i < refPlc.n; i++) {
      const a = txtPlc.cps[i], b = txtPlc.cps[i + 1];
      if (a === undefined || b === undefined) break;
      out.push({ refCp: refPlc.cps[i]!, auto: refPlc.r.i16(refPlc.dataAt(i)) > 0, cpStart: base + a, cpEnd: base + b });
    }
    return out;
  }

  // ───────────────────────────── comentários ─────────────────────────────

  comments(): Comment[] {
    const ref = this.fib.fcLcb(FC.PlcfandRef);
    const txt = this.fib.fcLcb(FC.PlcfandTxt);
    const refPlc = readPlc(this.table, ref.fc, ref.lcb, 30);
    const txtPlc = readPlc(this.table, txt.fc, txt.lcb, 0);
    if (!refPlc || !txtPlc) return [];
    const owners = this.xstArray(FC.GrpXstAtnOwners);
    const base = this.sub.atn[0];
    // bookmarks de anotação (faixas comentadas)
    const bkf = this.fib.fcLcb(FC.PlcfAtnBkf);
    const bkl = this.fib.fcLcb(FC.PlcfAtnBkl);
    const bkfPlc = readPlc(this.table, bkf.fc, bkf.lcb, 4);
    const bklPlc = readPlc(this.table, bkl.fc, bkl.lcb, 0);
    const sttb = this.sttb(FC.SttbfAtnBkmk);
    const ranges = new Map<number, [number, number]>();
    if (bkfPlc && bklPlc) {
      for (let i = 0; i < bkfPlc.n; i++) {
        const ibkl = bkfPlc.r.u16(bkfPlc.dataAt(i));
        const end = bklPlc.cps[ibkl];
        const lTag = sttb[i]?.extra ? new ByteReader(sttb[i]!.extra!).i32(2) : i;
        if (end !== undefined) ranges.set(lTag, [bkfPlc.cps[i]!, end]);
      }
    }
    const out: Comment[] = [];
    for (let i = 0; i < refPlc.n; i++) {
      const a = txtPlc.cps[i], b = txtPlc.cps[i + 1];
      if (a === undefined || b === undefined) break;
      const o = refPlc.dataAt(i);
      const cchInit = Math.min(9, refPlc.r.u16(o));
      const initials = refPlc.r.utf16(o + 2, cchInit);
      const ibst = refPlc.r.i16(o + 20);
      const lTag = refPlc.r.i32(o + 26);
      const range = ranges.get(lTag);
      out.push({
        refCp: refPlc.cps[i]!, cpStart: base + a, cpEnd: base + b,
        author: owners[ibst] ?? '', initials,
        rangeStart: range?.[0], rangeEnd: range?.[1],
      });
    }
    return out;
  }

  /** Lista de Xst (cch u16 + UTF-16) consecutivos. */
  private xstArray(idx: number): string[] {
    const { fc, lcb } = this.fib.fcLcb(idx);
    if (!lcb || fc + lcb > this.table.length) return [];
    const r = new ByteReader(this.table);
    const out: string[] = [];
    let o = fc;
    while (o + 2 <= fc + lcb) {
      const cch = r.u16(o);
      out.push(r.utf16(o + 2, cch));
      o += 2 + cch * 2;
    }
    return out;
  }

  /** STTB (estendida ou não) → strings + dados extras. */
  sttb(idx: number): { s: string; extra?: Uint8Array }[] {
    const { fc, lcb } = this.fib.fcLcb(idx);
    if (!lcb || fc + lcb > this.table.length) return [];
    const r = new ByteReader(this.table);
    let o = fc;
    let cData = r.u16(o); o += 2;
    let ext = false;
    if (cData === 0xffff) { ext = true; cData = r.u16(o); o += 2; }
    const cbExtra = r.u16(o); o += 2;
    const out: { s: string; extra?: Uint8Array }[] = [];
    for (let i = 0; i < cData && o < fc + lcb; i++) {
      let s: string;
      if (ext) { const cch = r.u16(o); s = r.utf16(o + 2, cch); o += 2 + cch * 2; }
      else { const cch = r.u8(o); s = ''; for (let k = 0; k < cch; k++) s += String.fromCharCode(r.u8(o + 1 + k)); o += 1 + cch; }
      const extra = cbExtra ? r.sub(o, o + cbExtra) : undefined;
      o += cbExtra;
      out.push({ s, extra });
    }
    return out;
  }

  // ───────────────────────────── bookmarks ─────────────────────────────

  bookmarks(): Bookmark[] {
    const names = this.sttb(FC.SttbfBkmk);
    const bkf = this.fib.fcLcb(FC.PlcfBkf);
    const bkl = this.fib.fcLcb(FC.PlcfBkl);
    const bkfPlc = readPlc(this.table, bkf.fc, bkf.lcb, 4);
    const bklPlc = readPlc(this.table, bkl.fc, bkl.lcb, 0);
    if (!bkfPlc || !bklPlc) return [];
    const out: Bookmark[] = [];
    for (let i = 0; i < bkfPlc.n && i < names.length; i++) {
      const ibkl = bkfPlc.r.u16(bkfPlc.dataAt(i));
      const end = bklPlc.cps[ibkl];
      if (end === undefined) continue;
      out.push({ name: names[i]!.s, cpStart: bkfPlc.cps[i]!, cpEnd: end });
    }
    return out;
  }

  /** Autores de revisão (SttbfRMark). */
  revisionAuthors(): string[] {
    return this.sttb(FC.SttbfRMark).map((e) => e.s);
  }

  // ───────────────────────────── desenhos ─────────────────────────────

  fspas(hdr: boolean): Fspa[] {
    const { fc, lcb } = this.fib.fcLcb(hdr ? FC.PlcSpaHdr : FC.PlcSpaMom);
    const plc = readPlc(this.table, fc, lcb, 26);
    if (!plc) return [];
    const base = hdr ? this.sub.hdd[0] : 0;
    const out: Fspa[] = [];
    for (let i = 0; i < plc.n; i++) {
      const o = plc.dataAt(i);
      const r = plc.r;
      const flags = r.u16(o + 20);
      out.push({
        cp: base + plc.cps[i]!,
        spid: r.i32(o), xaLeft: r.i32(o + 4), yaTop: r.i32(o + 8), xaRight: r.i32(o + 12), yaBottom: r.i32(o + 16),
        bx: (flags >> 1) & 3, by: (flags >> 3) & 3, wr: (flags >> 5) & 0xf, wrk: (flags >> 9) & 0xf,
        belowText: (flags & 0x4000) !== 0, anchorLock: (flags & 0x8000) !== 0,
      });
    }
    return out;
  }

  private loadDrawings(): void {
    if (this.shapesMain) return;
    this.shapesMain = new Map();
    this.shapesHdr = new Map();
    this.bstore = [];
    const { fc, lcb } = this.fib.fcLcb(FC.DggInfo);
    if (!lcb || fc + lcb > this.table.length) return;
    const r = new ByteReader(this.table);
    const end = fc + lcb;
    const dgg = readRec(r, fc, end);
    if (!dgg || dgg.type !== OA.DggContainer) return;
    for (const c of children(dgg)) if (c.type === OA.BStoreContainer) this.bstore = readBStore(c);
    // OfficeArtWordDrawing: dgglbl (u8) + OfficeArtDgContainer
    let o = dgg.start + dgg.len;
    let guard = 0;
    while (o + 9 <= end && guard++ < 16) {
      const lbl = r.u8(o);
      const dg = readRec(r, o + 1, end);
      if (!dg || dg.type !== OA.DgContainer) break;
      indexDrawing(dg, lbl === 1 ? this.shapesHdr : this.shapesMain);
      o = dg.start + dg.len;
    }
    for (const m of [this.shapesMain, this.shapesHdr]) applyMasters(m, this.masters);
  }

  /** spids das formas-mestre (hspMaster de outra forma): o Word não as desenha. */
  readonly masters = new Set<number>();

  shape(spid: number, hdr: boolean): OAShape | undefined {
    this.loadDrawings();
    return (hdr ? this.shapesHdr : this.shapesMain)!.get(spid) ?? (hdr ? this.shapesMain : this.shapesHdr)!.get(spid);
  }

  /** Entrada do BStore (pib 1-based). */
  bse(pib: number): BseEntry | undefined {
    this.loadDrawings();
    return this.bstore![pib - 1];
  }

  /** Histórias de caixas de texto: lid (spid) → faixa. */
  textboxes(hdr: boolean): TxbxStory[] {
    const { fc, lcb } = this.fib.fcLcb(hdr ? FC.PlcfHdrtxbxTxt : FC.PlcftxbxTxt);
    const plc = readPlc(this.table, fc, lcb, 22);
    if (!plc) return [];
    const base = (hdr ? this.sub.hdrTxbx : this.sub.txbx)[0];
    const out: TxbxStory[] = [];
    for (let i = 0; i < plc.n; i++) {
      const o = plc.dataAt(i);
      const lid = plc.r.i32(o + 14);
      const a = plc.cps[i]!, b = plc.cps[i + 1]!;
      if (b > a) out.push({ spid: lid, cpStart: base + a, cpEnd: base + b });
    }
    return out;
  }

  /** Registros OfficeArt do Data stream em [start, end). */
  dataRecords(start: number, end: number): ReturnType<typeof recsIn> {
    if (!this.data) return [];
    return recsIn(new ByteReader(this.data), start, Math.min(end, this.data.length));
  }
}

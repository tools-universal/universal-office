/**
 * Subfluxo de globais da pasta ([MS-XLS] 2.1.7.20.1): fontes, formatos, XFs,
 * paleta, estilos, lista de planilhas (BOUNDSHEET), tabela de strings (SST),
 * modo de data, janela (aba ativa) e o grupo de desenhos (MSODRAWINGGROUP).
 */
import { INDEXED_COLORS_DEFAULT } from '../theme.js';
import { Bytes, Codepage, readChars, readXLString, readRichExtString, RT, type BiffRecord, type RichString } from './biff.js';
import { formulaAreas, type Area } from './formula.js';

export interface XlsFont {
  /** Altura em twips (1/20 pt). */
  height: number;
  italic: boolean;
  strike: boolean;
  outline: boolean;
  shadow: boolean;
  /** Peso (400 normal, 700 negrito). */
  weight: number;
  /** 0 nenhum, 1 sobrescrito, 2 subscrito. */
  script: number;
  /** 0 nenhum, 1 simples, 2 duplo, 0x21 simples contábil, 0x22 duplo contábil. */
  underline: number;
  family: number;
  charset: number;
  /** Índice de cor (icv); 0x7FFF = automática. */
  color: number;
  name: string;
}

/** Cor completa de uma extensão de XF (XFEXT / FullColorExt). */
export interface FullColor {
  /** 0 auto, 1 indexada, 2 RGB, 3 tema, 4 não definida. */
  type: number;
  /** RGB (#RRGGBB) quando type=2; índice quando 1/3. */
  rgb?: string;
  index?: number;
  /** Tint/shade −1..1 (nTintShade / 32767). */
  tint: number;
}

export interface XlsXf {
  font: number;
  fmt: number;
  isStyle: boolean;
  parent: number;
  /** alc: 0 geral, 1 esq., 2 centro, 3 dir., 4 preencher, 5 justificar, 6 centro-seleção, 7 distribuído. */
  halign: number;
  wrap: boolean;
  /** alcV: 0 topo, 1 centro, 2 base, 3 justificar, 4 distribuído. */
  valign: number;
  /** Rotação do texto (0–90 anti-horário, 91–180 horário, 255 empilhado). */
  rot: number;
  indent: number;
  shrink: boolean;
  /** Estilos de borda (dg*: 0 nenhum, 1 fina, 2 média…). */
  bLeft: number; bRight: number; bTop: number; bBottom: number; bDiag: number;
  /** Cores de borda (icv). */
  cLeft: number; cRight: number; cTop: number; cBottom: number; cDiag: number;
  /** grbitDiag: bit0 diagonal descendente, bit1 ascendente. */
  diag: number;
  /** fls: padrão de preenchimento (0 nenhum, 1 sólido, 2… padrões). */
  pattern: number;
  fore: number;
  back: number;
  /** Cores completas do XFEXT (Excel 2007+): chave = extType (4 fg, 5 bg, 7–11 bordas, 13 fonte). */
  ext?: Map<number, FullColor>;
}

export interface XlsSheetInfo {
  name: string;
  /** 0 visível, 1 oculta, 2 muito oculta. */
  state: number;
  /** dt: 0 planilha/diálogo, 1 macro XLM, 2 gráfico, 6 módulo VBA. */
  type: number;
  /** Offset do BOF da planilha no stream (lbPlyPos). */
  pos: number;
}

export interface XlsGlobals {
  biff: 5 | 8;
  cp: Codepage;
  date1904: boolean;
  /** Fontes NA ORDEM dos registros (o índice BIFF 4 não existe: ver `fontIndex`). */
  fonts: XlsFont[];
  formats: Map<number, string>;
  xfs: XlsXf[];
  /** Paleta efetiva (64 cores #RRGGBB, índices 0–63). */
  palette: string[];
  sheets: XlsSheetInfo[];
  sst: RichString[];
  activeTab: number;
  /** MSODRAWINGGROUP concatenado (OfficeArtDggContainer). */
  drawingGroup?: Uint8Array;
  /** Tema da pasta (registro THEME, Excel 2007+): pacote zip do tema. */
  themeZip?: Uint8Array;
  /** SUPBOOK: true = a própria pasta (referências internas). */
  supbooks: boolean[];
  /** EXTERNSHEET (BIFF8): ixti → { pasta, 1ª aba }. */
  xti: { book: number; tab: number }[];
  /** Nome embutido _FilterDatabase por aba (índice do BOUNDSHEET): área do autofiltro. */
  filterDb: Map<number, Area>;
  /** Nomes definidos (NAME), na ordem do arquivo — ptgName aponta 1-based. */
  names: string[];
  /** EXTERNNAME por SUPBOOK (funções de suplemento: ptgNameX). */
  externNames: string[][];
}

/** Nomes embutidos (Lbl.fBuiltin) pelo código de 1 caractere. */
const BUILTIN_NAMES: Record<number, string> = {
  0: 'Consolidate_Area', 1: 'Auto_Open', 2: 'Auto_Close', 3: 'Extract', 4: 'Database', 5: 'Criteria', 6: 'Print_Area',
  7: 'Print_Titles', 8: 'Recorder', 9: 'Data_Form', 10: 'Auto_Activate', 11: 'Auto_Deactivate', 12: 'Sheet_Title', 13: '_FilterDatabase',
};

/** ifnt BIFF → posição em `fonts` (o índice 4 é omitido pelo formato). */
export function fontIndex(ifnt: number): number {
  return ifnt < 4 ? ifnt : ifnt - 1;
}

/** Erro amigável de pasta criptografada. */
export class XlsEncryptedError extends Error {
  constructor() {
    super('Pasta de trabalho .xls protegida por senha (criptografada) — abra no Excel, remova a senha e salve novamente');
    this.name = 'XlsEncryptedError';
  }
}

const hex2 = (n: number): string => n.toString(16).padStart(2, '0').toUpperCase();

/** Lê os registros de globais (do 1º BOF até o EOF correspondente). */
export function readGlobals(recs: Iterable<BiffRecord>, biff: 5 | 8): XlsGlobals {
  const g: XlsGlobals = {
    biff, cp: new Codepage(biff === 8 ? 1200 : 1252), date1904: false,
    fonts: [], formats: new Map(), xfs: [], palette: [...INDEXED_COLORS_DEFAULT.slice(0, 64)],
    sheets: [], sst: [], activeTab: 0, supbooks: [], xti: [], filterDb: new Map(), names: [], externNames: [],
  };
  const b8 = biff === 8;
  const dg: Uint8Array[] = [];
  let theme: Uint8Array[] | undefined;
  let first = true;
  for (const rec of recs) {
    const r = new Bytes(rec.data);
    if (first) { first = false; if (rec.type === RT.BOF) continue; }
    switch (rec.type) {
      case RT.EOF:
        if (dg.length) g.drawingGroup = concat(dg);
        if (theme) g.themeZip = concat(theme);
        return g;
      case RT.FILEPASS:
        throw new XlsEncryptedError();
      case RT.CODEPAGE:
        if (!b8) g.cp = new Codepage(r.u16(0));
        break;
      case RT.DATEMODE:
        g.date1904 = r.u16(0) === 1;
        break;
      case RT.WINDOW1:
        g.activeTab = r.u16(10);
        break;
      case RT.FONT: {
        const grbit = r.u16(2);
        g.fonts.push({
          height: r.u16(0),
          italic: (grbit & 0x02) !== 0,
          strike: (grbit & 0x08) !== 0,
          outline: (grbit & 0x10) !== 0,
          shadow: (grbit & 0x20) !== 0,
          color: r.u16(4),
          weight: r.u16(6),
          script: r.u16(8),
          underline: r.u8(10),
          family: r.u8(11),
          charset: r.u8(12),
          name: readXLString(r, 14, b8, g.cp, 1).text,
        });
        break;
      }
      case RT.FORMAT: {
        const id = r.u16(0);
        const s = b8 ? readXLString(r, 2, true, g.cp, 2, rec.conts) : readXLString(r, 2, false, g.cp, 1);
        g.formats.set(id, s.text);
        break;
      }
      case RT.XF:
        g.xfs.push(b8 ? readXf8(r) : readXf5(r));
        break;
      case RT.XFEXT:
        if (b8) readXfExt(r, g.xfs);
        break;
      case RT.PALETTE: {
        const n = Math.min(56, r.u16(0));
        for (let i = 0; i < n; i++) {
          const o = 2 + i * 4;
          if (o + 3 > r.length) break;
          g.palette[8 + i] = '#' + hex2(r.u8(o)) + hex2(r.u8(o + 1)) + hex2(r.u8(o + 2));
        }
        break;
      }
      case RT.BOUNDSHEET: {
        const pos = r.u32(0);
        const state = r.u8(4) & 3;
        const type = r.u8(5);
        const name = readXLString(r, 6, b8, g.cp, 1).text;
        g.sheets.push({ name, state, type, pos });
        break;
      }
      case RT.SST:
        if (b8) g.sst = readSst(r, rec.conts);
        break;
      case RT.MSODRAWINGGROUP:
        dg.push(rec.data);
        break;
      case RT.SUPBOOK:
        // cch = 0x0401: referências à própria pasta
        g.supbooks.push(r.u16(2) === 0x0401);
        break;
      case RT.NAME: {
        // Lbl (BIFF8): grbit, chKey, cch, cce, reservado, itab (1-based), 4 reservados,
        // nome (opções + chars), fórmula. Embutidos: 1 caractere com o código (0x0D = _FilterDatabase).
        if (!b8) { g.names.push(''); break; }
        const cch = r.u8(3), cce = r.u16(4), itab = r.u16(8);
        const high = (r.u8(14) & 1) !== 0;
        if (r.u16(0) & 0x20) {
          const code = high ? r.u16(15) : r.u8(15);
          g.names.push(BUILTIN_NAMES[code] ?? `_xlnm${code}`);
          if (code === 0x0d && itab > 0) {
            const area = formulaAreas(r, 15 + cch * (high ? 2 : 1), cce)[0];
            if (area) g.filterDb.set(itab - 1, area);
          }
        } else g.names.push(readChars(r, 15, cch, high, []).text);
        break;
      }
      case RT.EXTERNNAME:
        // nome externo (funções de suplemento, nomes de outras pastas): o texto está no offset 6
        if (b8) (g.externNames[g.supbooks.length - 1] ??= []).push(readXLString(r, 6, true, g.cp, 1).text);
        break;
      case RT.EXTERNSHEET:
        if (b8) {
          const n = r.u16(0);
          for (let i = 0, o = 2; i < n && o + 6 <= r.length; i++, o += 6) g.xti.push({ book: r.u16(o), tab: r.i16(o + 2) });
        }
        break;
      case RT.THEME: {
        // FrtHeader (12 bytes) + dwThemeVersion: 0 = tema PERSONALIZADO (pacote
        // zip do tema a seguir); 124226 = tema padrão do Office 2007 (sem dados)
        if (r.u32(12) === 0 && r.length > 16) { theme = [r.sub(16, r.length)]; continue; }
        break;
      }
      case CONTINUE_FRT:
        // continuação do THEME: FrtHeaderOld (rt u16 + grbitFrt u16) + dados
        if (theme) { theme.push(r.sub(4, r.length)); continue; }
        break;
    }
    if (theme) { g.themeZip = concat(theme); theme = undefined; }
  }
  if (dg.length) g.drawingGroup = concat(dg);
  if (theme) g.themeZip = concat(theme);
  return g;
}

/** ContinueFrt (0x0812): continuação de registros "future" grandes (THEME). */
const CONTINUE_FRT = 0x0812;

function concat(parts: Uint8Array[]): Uint8Array {
  if (parts.length === 1) return parts[0]!;
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** SST: cstTotal u32, cstUnique u32, strings (atravessando os CONTINUE). */
function readSst(r: Bytes, conts: number[]): RichString[] {
  const unique = r.u32(4);
  const out: RichString[] = [];
  let p = 8;
  // teto: cada string ocupa ≥ 3 bytes (um cstUnique hostil não aloca nada)
  const max = Math.min(unique, Math.floor((r.length - 8) / 3) + 1);
  for (let i = 0; i < max && p + 3 <= r.length; i++) {
    const { s, next } = readRichExtString(r, p, conts);
    out.push(s);
    p = next;
  }
  return out;
}

/** XF do BIFF8 (20 bytes, [MS-XLS] 2.4.353). */
function readXf8(r: Bytes): XlsXf {
  const flags = r.u16(4);
  const al = r.u8(6);
  const ind = r.u8(8);
  const b1 = r.u32(10);
  const b2 = r.u32(14);
  const f = r.u16(18);
  return {
    font: r.u16(0), fmt: r.u16(2), isStyle: (flags & 4) !== 0, parent: flags >>> 4,
    halign: al & 7, wrap: (al & 8) !== 0, valign: (al >>> 4) & 7, rot: r.u8(7),
    indent: ind & 0x0f, shrink: (ind & 0x10) !== 0,
    bLeft: b1 & 0xf, bRight: (b1 >>> 4) & 0xf, bTop: (b1 >>> 8) & 0xf, bBottom: (b1 >>> 12) & 0xf,
    cLeft: (b1 >>> 16) & 0x7f, cRight: (b1 >>> 23) & 0x7f, diag: (b1 >>> 30) & 3,
    cTop: b2 & 0x7f, cBottom: (b2 >>> 7) & 0x7f, cDiag: (b2 >>> 14) & 0x7f, bDiag: (b2 >>> 21) & 0xf,
    pattern: (b2 >>> 26) & 0x3f,
    fore: f & 0x7f, back: (f >>> 7) & 0x7f,
  };
}

/** XF do BIFF5/7 (16 bytes). */
function readXf5(r: Bytes): XlsXf {
  const flags = r.u16(4);
  const al = r.u8(6);
  const ori = r.u8(7) & 3;
  const a = r.u32(8);
  const b = r.u32(12);
  return {
    font: r.u16(0), fmt: r.u16(2), isStyle: (flags & 4) !== 0, parent: flags >>> 4,
    halign: al & 7, wrap: (al & 8) !== 0, valign: (al >>> 4) & 7,
    rot: ori === 1 ? 255 : ori === 2 ? 90 : ori === 3 ? 180 : 0,
    indent: 0, shrink: false,
    fore: a & 0x7f, back: (a >>> 7) & 0x7f, pattern: (a >>> 16) & 0x3f,
    bBottom: (a >>> 22) & 7, cBottom: (a >>> 25) & 0x7f,
    bTop: b & 7, bLeft: (b >>> 3) & 7, bRight: (b >>> 6) & 7,
    cTop: (b >>> 9) & 0x7f, cLeft: (b >>> 16) & 0x7f, cRight: (b >>> 23) & 0x7f,
    diag: 0, bDiag: 0, cDiag: 0,
  };
}

/**
 * XFEXT ([MS-XLS] 2.4.355): cores completas (RGB/tema) gravadas pelo Excel
 * 2007+ ao lado do XF — a paleta de 56 cores só guarda a aproximação.
 * FrtHeader (12) + reserved u16 + ixfe u16 + reserved u16 + cexts u16 + ExtProp[].
 */
function readXfExt(r: Bytes, xfs: XlsXf[]): void {
  const ixfe = r.u16(14);
  const xf = xfs[ixfe];
  if (!xf) return;
  const n = r.u16(18);
  let p = 20;
  for (let i = 0; i < n && p + 4 <= r.length; i++) {
    const type = r.u16(p);
    const cb = r.u16(p + 2);
    if (cb < 4) break;
    // FullColorExt: xclrType u16, nTintShade i16, xclrValue u32
    if ((type >= 4 && type <= 5) || (type >= 7 && type <= 11) || type === 13) {
      const ct = r.u16(p + 4);
      const tint = r.i16(p + 6) / 32767;
      const v = r.u32(p + 8);
      const fc: FullColor = { type: ct, tint };
      if (ct === 2) fc.rgb = '#' + hex2(v & 0xff) + hex2((v >>> 8) & 0xff) + hex2((v >>> 16) & 0xff);
      else fc.index = v;
      (xf.ext ??= new Map()).set(type, fc);
    }
    p += cb;
  }
}

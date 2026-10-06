/**
 * Registros binários do PowerPoint 97-2003 ([MS-PPT] 2.3.1) e do OfficeArt
 * ([MS-ODRAW] 2.1.1): todo registro começa com um cabeçalho de 8 bytes
 *
 *   u16  recVer (4 bits baixos) + recInstance (12 bits altos)
 *   u16  recType
 *   u32  recLen   (bytes de dados após o cabeçalho)
 *
 * `recVer = 0xF` marca um CONTÊINER (os dados são outros registros).
 */

/** Leitor little-endian com verificação de limites sobre um Uint8Array. */
export class ByteReader {
  readonly bytes: Uint8Array;
  private readonly view: DataView;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  get length(): number { return this.bytes.length; }
  u8(off: number): number { return off < this.bytes.length && off >= 0 ? this.bytes[off]! : 0; }
  u16(off: number): number { return off + 2 <= this.bytes.length && off >= 0 ? this.view.getUint16(off, true) : 0; }
  i16(off: number): number { return off + 2 <= this.bytes.length && off >= 0 ? this.view.getInt16(off, true) : 0; }
  u32(off: number): number { return off + 4 <= this.bytes.length && off >= 0 ? this.view.getUint32(off, true) : 0; }
  i32(off: number): number { return off + 4 <= this.bytes.length && off >= 0 ? this.view.getInt32(off, true) : 0; }
  f32(off: number): number { return off + 4 <= this.bytes.length && off >= 0 ? this.view.getFloat32(off, true) : 0; }
  sub(start: number, end: number): Uint8Array {
    return this.bytes.subarray(Math.max(0, start), Math.min(this.bytes.length, end));
  }
}

/** Registro já delimitado: cabeçalho + faixa [start, end) dos dados. */
export interface Rec {
  ver: number;
  inst: number;
  type: number;
  len: number;
  /** Offset do cabeçalho no buffer. */
  hdr: number;
  /** Início dos dados (hdr + 8). */
  start: number;
  /** Fim dos dados (exclusivo), já limitado ao pai. */
  end: number;
  r: ByteReader;
}

/** Lê o registro cujo cabeçalho está em `off` (limitado a `limit`). */
export function readRec(r: ByteReader, off: number, limit = r.length): Rec | undefined {
  if (off + 8 > limit) return undefined;
  const vi = r.u16(off);
  const len = r.u32(off + 4);
  const start = off + 8;
  return { ver: vi & 0xf, inst: vi >>> 4, type: r.u16(off + 2), len, hdr: off, start, end: Math.min(limit, start + len), r };
}

/** É contêiner (recVer = 0xF)? */
export function isContainer(rec: Rec): boolean { return rec.ver === 0xf; }

/** Filhos diretos de um contêiner (ou de uma faixa arbitrária de bytes). */
export function children(rec: Rec): Rec[] {
  return recsIn(rec.r, rec.start, rec.end);
}

/** Registros consecutivos em [start, end). Para no primeiro cabeçalho inválido. */
export function recsIn(r: ByteReader, start: number, end: number): Rec[] {
  const out: Rec[] = [];
  let off = start;
  while (off + 8 <= end) {
    const rec = readRec(r, off, end);
    if (!rec) break;
    out.push(rec);
    if (rec.start + rec.len > end) break; // registro transborda o pai: corrompido
    off = rec.start + rec.len;
  }
  return out;
}

/** Primeiro filho com o tipo dado (opcionalmente com a instância dada). */
export function child(rec: Rec, type: number, inst?: number): Rec | undefined {
  for (const c of children(rec)) if (c.type === type && (inst === undefined || c.inst === inst)) return c;
  return undefined;
}

/** Todos os filhos com o tipo dado. */
export function childrenOf(rec: Rec, type: number): Rec[] {
  return children(rec).filter((c) => c.type === type);
}

/** Bytes dos dados do registro. */
export function recData(rec: Rec): Uint8Array { return rec.r.sub(rec.start, rec.end); }

/** Busca em profundidade o primeiro descendente com o tipo dado. */
export function findDeep(rec: Rec, type: number): Rec | undefined {
  for (const c of children(rec)) {
    if (c.type === type) return c;
    if (isContainer(c)) {
      const f = findDeep(c, type);
      if (f) return f;
    }
  }
  return undefined;
}

/** Decodifica UTF-16LE (sem terminador) de [start, end). */
export function utf16(r: ByteReader, start: number, end: number): string {
  let s = '';
  for (let o = start; o + 1 < end; o += 2) s += String.fromCharCode(r.u16(o));
  return s;
}

/** Decodifica bytes "Latin-1" (byte baixo de UTF-16 com byte alto zero) de [start, end). */
export function latin1(r: ByteReader, start: number, end: number): string {
  let s = '';
  for (let o = start; o < end; o++) s += String.fromCharCode(r.u8(o));
  return s;
}

// ───────────────────────── tipos de registro [MS-PPT] ─────────────────────────

export const RT = {
  Document: 0x03e8,
  DocumentAtom: 0x03e9,
  EndDocumentAtom: 0x03ea,
  Slide: 0x03ee,
  SlideAtom: 0x03ef,
  Notes: 0x03f0,
  NotesAtom: 0x03f1,
  Environment: 0x03f2,
  SlidePersistAtom: 0x03f3,
  MainMaster: 0x03f8,
  SlideShowSlideInfoAtom: 0x03f9,
  SlideShowDocInfoAtom: 0x0401,
  ExternalObjectList: 0x0409,
  DrawingGroup: 0x040b,
  Drawing: 0x040c,
  RoundTripTheme12Atom: 0x040e,
  RoundTripColorMapping12Atom: 0x040f,
  RoundTripContentMasterInfo12Atom: 0x041e,
  RoundTripOArtTextStyles12Atom: 0x0423,
  List: 0x07d0,
  FontCollection: 0x07d5,
  SoundCollection: 0x07e4,
  ColorSchemeAtom: 0x07f0,
  ExObjRefAtom: 0x0bc1,
  PlaceholderAtom: 0x0bc3,
  ShapeAtom: 0x0bdb,
  ShapeFlags10Atom: 0x0bdc,
  RoundTripNewPlaceholderId12Atom: 0x0bdd,
  OutlineTextRefAtom: 0x0f9e,
  TextHeaderAtom: 0x0f9f,
  TextCharsAtom: 0x0fa0,
  StyleTextPropAtom: 0x0fa1,
  MasterTextPropAtom: 0x0fa2,
  TextMasterStyleAtom: 0x0fa3,
  TextCharFormatExceptionAtom: 0x0fa4,
  TextParagraphFormatExceptionAtom: 0x0fa5,
  TextRulerAtom: 0x0fa6,
  TextBookmarkAtom: 0x0fa7,
  TextBytesAtom: 0x0fa8,
  TextSpecialInfoDefaultAtom: 0x0fa9,
  TextSpecialInfoAtom: 0x0faa,
  DefaultRulerAtom: 0x0fab,
  StyleTextProp9Atom: 0x0fac,
  TextMasterStyle9Atom: 0x0fad,
  FontEntityAtom: 0x0fb7,
  CString: 0x0fba,
  ExternalHyperlinkAtom: 0x0fd3,
  ExternalHyperlink: 0x0fd7,
  SlideNumberMetaCharAtom: 0x0fd8,
  HeadersFooters: 0x0fd9,
  HeadersFootersAtom: 0x0fda,
  TextInteractiveInfoAtom: 0x0fdf,
  SlideListWithText: 0x0ff0,
  AnimationInfoAtom: 0x0ff1,
  InteractiveInfo: 0x0ff2,
  InteractiveInfoAtom: 0x0ff3,
  UserEditAtom: 0x0ff5,
  CurrentUserAtom: 0x0ff6,
  DateTimeMetaCharAtom: 0x0ff7,
  GenericDateMetaCharAtom: 0x0ff8,
  HeaderMetaCharAtom: 0x0ff9,
  FooterMetaCharAtom: 0x0ffa,
  ExternalVideo: 0x1005,
  AnimationInfo: 0x1014,
  RtfDateTimeMetaCharAtom: 0x1015,
  ProgTags: 0x1388,
  ProgStringTag: 0x1389,
  ProgBinaryTag: 0x138a,
  BinaryTagDataBlob: 0x138b,
  PersistDirectoryAtom: 0x1772,
  HashCodeAtom: 0x2b00,
  BuildList: 0x2b02,
  BuildAtom: 0x2b03,
  ChartBuild: 0x2b04,
  ChartBuildAtom: 0x2b05,
  DiagramBuild: 0x2b06,
  DiagramBuildAtom: 0x2b07,
  ParaBuild: 0x2b08,
  ParaBuildAtom: 0x2b09,
  LevelInfoAtom: 0x2b0a,
  RoundTripAnimationAtom12Atom: 0x2b0b,
  RoundTripAnimationHashAtom12Atom: 0x2b0d,
  SlideFlags10Atom: 0x2eea,
  SlideTime10Atom: 0x2eeb,
  CryptSession10Container: 0x2f14,
  TimeConditionContainer: 0xf125,
  TimeNode: 0xf127,
  TimeCondition: 0xf128,
  TimeModifier: 0xf129,
  TimeBehaviorContainer: 0xf12a,
  TimeAnimateBehaviorContainer: 0xf12b,
  TimeColorBehaviorContainer: 0xf12c,
  TimeEffectBehaviorContainer: 0xf12d,
  TimeMotionBehaviorContainer: 0xf12e,
  TimeRotationBehaviorContainer: 0xf12f,
  TimeScaleBehaviorContainer: 0xf130,
  TimeSetBehaviorContainer: 0xf131,
  TimeCommandBehaviorContainer: 0xf132,
  TimeBehavior: 0xf133,
  TimeAnimateBehavior: 0xf134,
  TimeColorBehavior: 0xf135,
  TimeEffectBehavior: 0xf136,
  TimeMotionBehavior: 0xf137,
  TimeRotationBehavior: 0xf138,
  TimeScaleBehavior: 0xf139,
  TimeSetBehavior: 0xf13a,
  TimeCommandBehavior: 0xf13b,
  TimeClientVisualElement: 0xf13c,
  TimePropertyList: 0xf13d,
  TimeVariantList: 0xf13e,
  TimeAnimationValueList: 0xf13f,
  TimeIterateData: 0xf140,
  TimeSequenceData: 0xf141,
  TimeVariant: 0xf142,
  TimeAnimationValue: 0xf143,
  ExtTimeNodeContainer: 0xf144,
  SubEffectContainer: 0xf145,
} as const;

// ───────────────────────── tipos de registro [MS-ODRAW] ─────────────────────────

export const OA = {
  DggContainer: 0xf000,
  BStoreContainer: 0xf001,
  DgContainer: 0xf002,
  SpgrContainer: 0xf003,
  SpContainer: 0xf004,
  SolverContainer: 0xf005,
  FDGGBlock: 0xf006,
  FBSE: 0xf007,
  FDG: 0xf008,
  FSPGR: 0xf009,
  FSP: 0xf00a,
  FOPT: 0xf00b,
  ClientTextbox: 0xf00d,
  ChildAnchor: 0xf00f,
  ClientAnchor: 0xf010,
  ClientData: 0xf011,
  BlipEMF: 0xf01a,
  BlipWMF: 0xf01b,
  BlipPICT: 0xf01c,
  BlipJPEG: 0xf01d,
  BlipPNG: 0xf01e,
  BlipDIB: 0xf01f,
  BlipTIFF: 0xf029,
  BlipJPEGCMYK: 0xf02a,
  SecondaryFOPT: 0xf121,
  TertiaryFOPT: 0xf122,
} as const;

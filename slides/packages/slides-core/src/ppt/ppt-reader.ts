/**
 * Leitura do binário do PowerPoint 97-2003 ([MS-PPT]) para um modelo
 * intermediário fiel aos registros — o conversor (to-pptx.ts) o materializa em
 * PresentationML.
 *
 * Caminho dos dados:
 *   "Current User" (CurrentUserAtom.offsetToCurrentEdit)
 *     → UserEditAtom (mais recente) → … → offsetLastEdit (edições antigas)
 *     → PersistDirectoryAtom de cada edição (persistId → offset no stream)
 *     → DocumentContainer (docPersistIdRef): DocumentAtom (tamanhos),
 *       Environment (fontes, estilos padrão), DrawingGroup (BStore das
 *       imagens), SlideListWithText (mestres / slides / notas)
 *     → MainMasterContainer / SlideContainer por persistId.
 */
import { readCfb, type CfbFile } from './cfb.js';
import { ByteReader, type Rec, readRec, recsIn, children, child, recData, RT, OA, utf16 } from './records.js';
import { readDgContainer, readBStore, decodeBlip, type OADrawing, type Blip } from './officeart.js';
import {
  readTextMasterStyle, readCFExceptionAtom, readPFExceptionAtom, splitTextBlocks, readStyleTextProp9,
  type TextBlock, type TextCF, type TextPF, type MasterStyleLevel,
} from './text.js';

/** Fonte da FontCollection (FontEntityAtom). */
export interface PptFont { name: string; charset: number; pitchFamily: number }

/** Transição de entrada (SSSlideInfoAtom). */
export interface PptTransition {
  effectType: number;
  effectDirection: number;
  /** 0 lento, 1 médio, 2 rápido (medido no PowerPoint). */
  speed: number;
  /** Tempo de exibição (ms) quando avança sozinho. */
  slideTime: number;
  manualAdvance: boolean;
  autoAdvance: boolean;
  hidden: boolean;
  sound: boolean;
}

/** Slide, mestre principal, mestre de título ou página de notas, já decodificado. */
export interface PptSlide {
  kind: 'slide' | 'mainMaster' | 'titleMaster' | 'notes';
  /** Notas: slideId do slide a que pertencem (NotesAtom.slideIdRef). */
  slideIdRef?: number;
  persistId: number;
  /** SlidePersistAtom.slideId (o que masterIdRef referencia). */
  slideId: number;
  /** SlideAtom.geom (SlideLayoutType). */
  geom: number;
  placeholderTypes: number[];
  masterIdRef: number;
  /** SlideAtom.slideFlags: bit0 objetos do mestre, bit1 esquema do mestre, bit2 fundo do mestre. */
  flags: number;
  /** Esquema de cores do slide (8 cores 'RRGGBB'). */
  colorScheme?: string[];
  transition?: PptTransition;
  drawing: OADrawing;
  /** Texto dos placeholders vindo do SlideListWithText (OutlineTextRefAtom). */
  outline: TextBlock[];
  /** Estilos-mestre por tipo de texto (instância do TextMasterStyleAtom). */
  masterStyles?: Map<number, MasterStyleLevel[]>;
  /** Etiquetas binárias da forma ProgTags → nome ("___PPT10", …) → blob. */
  binaryTags: Map<string, Rec>;
  name?: string;
  /** RoundTripTheme12Atom (zip com o tema original, PowerPoint 2007+). */
  roundTripTheme?: Uint8Array;
  /**
   * RoundTripAnimationAtom12 (zip com `drs/timingInfo.xml` = o `<p:timing>`
   * ORIGINAL): o app grava quando o binário PPT10 não representa a animação
   * (gráfico/SmartArt por partes, texto em colunas…) — às vezes com a árvore
   * PPT10 vazia.
   */
  roundTripTiming?: Uint8Array;
  /** Cabeçalho/rodapé próprio do slide (sobrepõe o do documento). */
  headersFooters?: PptHeadersFooters;
}

/** HeadersFootersContainer: o que exibir dos placeholders de data/nº/rodapé do mestre. */
export interface PptHeadersFooters {
  hasDate: boolean;
  hasTodayDate: boolean;
  hasUserDate: boolean;
  hasSlideNumber: boolean;
  hasHeader: boolean;
  hasFooter: boolean;
  /** Formato da data automática (índice da lista de formatos do PowerPoint). */
  formatId: number;
  userDate?: string;
  header?: string;
  footer?: string;
}

/** Hiperlink externo (ExternalHyperlinkContainer do ExObjList). */
export interface PptHyperlink { target?: string; location?: string; friendlyName?: string }

export interface PptDocument {
  /** Tamanho do slide em mestre-unidades (576/polegada). */
  slideW: number;
  slideH: number;
  notesW: number;
  notesH: number;
  slideSizeType: number;
  firstSlideNumber: number;
  fonts: PptFont[];
  /** Padrões de caractere/parágrafo do documento (Environment). */
  docCF: TextCF;
  docPF: TextPF;
  /** TextMasterStyleAtom do Environment (tipo "outro"). */
  docOtherStyle?: MasterStyleLevel[];
  /** Imagens do BStore (índice pib − 1). */
  blips: (Blip | undefined)[];
  masters: PptSlide[];
  slides: PptSlide[];
  /** Páginas de notas (uma por slide que tem notas) e o mestre das notas. */
  notes: PptSlide[];
  notesMaster?: PptSlide;
  /** Etiquetas binárias do documento (ex.: "___PPT9" com OutlineTextProps9). */
  binaryTags: Map<string, Rec>;
  /** Hiperlinks por exHyperlinkId. */
  hyperlinks: Map<number, PptHyperlink>;
  /** Idioma padrão do texto (LCID do TextSpecialInfoDefaultAtom). */
  docLcid?: number;
  /** Cabeçalho/rodapé dos slides (SlideHeadersFootersContainer do documento). */
  slideHeadersFooters?: PptHeadersFooters;
  /** DocumentAtom.fOmitTitlePlace: não mostrar data/nº/rodapé em slides de título. */
  omitTitlePlace: boolean;
  /**
   * PP9 do texto de OUTLINE (placeholders): OutlineTextProps9Container da
   * etiqueta "___PPT9" do documento, por `${slideIdRef}:${tipoDeTexto}`.
   */
  outlinePf9: Map<string, TextPF[]>;
}

/** Erro de formato com mensagem em português (vai para o usuário final). */
export class PptFormatError extends Error {
  constructor(msg: string) { super(msg); this.name = 'PptFormatError'; }
}

const HEADER_TOKEN_PLAIN = 0xe391c05f;
const HEADER_TOKEN_ENCRYPTED = 0xf3d1c4df;

/** Abre um .ppt e lê o modelo intermediário. */
export function readPptDocument(bytes: Uint8Array): PptDocument {
  let cfb: CfbFile;
  try { cfb = readCfb(bytes); } catch (e) {
    throw new PptFormatError(`Arquivo .ppt inválido ou corrompido: ${(e as Error).message}`);
  }
  if (cfb.has('EncryptedPackage') || cfb.has('EncryptionInfo')) {
    throw new PptFormatError('Apresentação protegida por senha (criptografada) — não é possível abri-la.');
  }
  const docBytes = cfb.getStream('PowerPoint Document');
  if (!docBytes) {
    if (cfb.has('PP40') || cfb.has('PP97_DUALSTORAGE')) {
      throw new PptFormatError('Formato do PowerPoint 95 ou anterior não é suportado (use PowerPoint 97-2003 ou .pptx).');
    }
    throw new PptFormatError('O arquivo não contém uma apresentação do PowerPoint (stream "PowerPoint Document" ausente).');
  }
  const doc = new ByteReader(docBytes);

  // CurrentUserAtom → offset da edição corrente
  let currentEdit: number | undefined;
  const cuBytes = cfb.getStream('Current User');
  if (cuBytes && cuBytes.length >= 20) {
    const cu = new ByteReader(cuBytes);
    const rec = readRec(cu, 0);
    if (rec && rec.type === RT.CurrentUserAtom) {
      const token = cu.u32(rec.start + 4);
      if (token === HEADER_TOKEN_ENCRYPTED) {
        throw new PptFormatError('Apresentação protegida por senha (criptografada) — não é possível abri-la.');
      }
      // token desconhecido: ainda tenta o offset (validado por isUserEdit)
      void HEADER_TOKEN_PLAIN;
      currentEdit = cu.u32(rec.start + 8);
    }
  }
  const edits = collectUserEdits(doc, currentEdit);
  if (!edits.length) throw new PptFormatError('Estrutura do .ppt não reconhecida (UserEditAtom ausente).');
  const newest = edits[0]!;
  if (newest.len >= 0x20 && doc.u32(newest.start + 28) !== 0) {
    throw new PptFormatError('Apresentação protegida por senha (criptografada) — não é possível abri-la.');
  }
  const persist = buildPersistDirectory(doc, edits);
  const docPersistId = doc.u32(newest.start + 16);
  const docRec = recAtPersist(doc, persist, docPersistId);
  if (!docRec || docRec.type !== RT.Document) throw new PptFormatError('DocumentContainer ausente no .ppt.');

  const out: PptDocument = {
    slideW: 5760, slideH: 4320, notesW: 4320, notesH: 5760, slideSizeType: 0, firstSlideNumber: 1,
    fonts: [], docCF: {}, docPF: {}, blips: [], masters: [], slides: [], notes: [], binaryTags: new Map(),
    hyperlinks: new Map(), omitTitlePlace: false, outlinePf9: new Map(),
  };
  let notesMasterPersist = 0;
  const picStream = cfb.getStream('Pictures');
  const pics = picStream ? new ByteReader(picStream) : undefined;

  const masterRefs: { persistId: number; slideId: number }[] = [];
  const slideRefs: { persistId: number; slideId: number; texts: TextBlock[] }[] = [];
  const notesRefs: { persistId: number; slideId: number; texts: TextBlock[] }[] = [];

  for (const c of children(docRec)) {
    switch (c.type) {
      case RT.DocumentAtom: {
        const r = c.r, o = c.start;
        out.slideW = r.i32(o); out.slideH = r.i32(o + 4);
        out.notesW = r.i32(o + 8); out.notesH = r.i32(o + 12);
        notesMasterPersist = r.u32(o + 24);
        out.firstSlideNumber = r.u16(o + 32);
        out.slideSizeType = r.u16(o + 34);
        out.omitTitlePlace = r.u8(o + 37) !== 0;
        break;
      }
      case RT.HeadersFooters:
        if (c.inst === 3) out.slideHeadersFooters = readHeadersFooters(c);
        break;
      case RT.Environment: readEnvironment(c, out); break;
      case RT.DrawingGroup: {
        const dgg = child(c, OA.DggContainer);
        const bstore = dgg ? child(dgg, OA.BStoreContainer) : undefined;
        if (bstore) {
          out.blips = readBStore(bstore).map((e) => {
            if (!e) return undefined;
            try {
              if (e.embedded) return decodeBlip(e.embedded);
              if (!pics || e.foDelay === 0xffffffff || e.foDelay >= pics.length) return undefined;
              const blipRec = readRec(pics, e.foDelay);
              return blipRec ? decodeBlip(blipRec) : undefined;
            } catch { return undefined; }
          });
        }
        break;
      }
      case RT.SlideListWithText: {
        // filhos: SlidePersistAtom seguido dos blocos de texto daquele slide
        let cur: { persistId: number; slideId: number; texts: TextBlock[] } | undefined;
        let pending: Rec[] = [];
        const flush = (): void => { if (cur) cur.texts.push(...splitTextBlocks(pending)); pending = []; };
        for (const k of children(c)) {
          if (k.type === RT.SlidePersistAtom) {
            flush();
            cur = { persistId: k.r.u32(k.start), slideId: k.r.u32(k.start + 12), texts: [] };
            if (c.inst === 1) masterRefs.push(cur);
            else if (c.inst === 0) slideRefs.push(cur);
            else if (c.inst === 2) notesRefs.push(cur);
          } else pending.push(k);
        }
        flush();
        break;
      }
      case RT.List: readProgTags(c, out.binaryTags); break;
      case RT.ExternalObjectList:
        for (const x of children(c)) {
          if (x.type !== RT.ExternalHyperlink) continue;
          let id: number | undefined;
          const link: PptHyperlink = {};
          for (const k of children(x)) {
            if (k.type === RT.ExternalHyperlinkAtom) id = k.r.u32(k.start);
            else if (k.type === RT.CString) {
              const s = utf16(k.r, k.start, k.end);
              if (k.inst === 0) link.friendlyName = s;
              else if (k.inst === 1) link.target = s;
              else if (k.inst === 3) link.location = s;
            }
          }
          if (id !== undefined) out.hyperlinks.set(id, link);
        }
        break;
    }
  }

  // OutlineTextProps9Container (0x0FAE): pares OutlineTextPropsHeaderExAtom
  // (0x0FAF: slideIdRef, txType) + StyleTextProp9Atom (numeração do outline)
  const pp9 = out.binaryTags.get('___PPT9');
  if (pp9) {
    for (const c of recsIn(pp9.r, pp9.start, pp9.end)) {
      if (c.type !== 0x0fae) continue;
      let key: string | undefined;
      for (const k of children(c)) {
        if (k.type === 0x0faf) key = `${k.r.u32(k.start)}:${k.r.u32(k.start + 4)}`;
        else if (k.type === RT.StyleTextProp9Atom && key) { out.outlinePf9.set(key, readStyleTextProp9(k)); key = undefined; }
      }
    }
  }

  for (const m of masterRefs) {
    const rec = recAtPersist(doc, persist, m.persistId);
    if (!rec) continue;
    const kind = rec.type === RT.MainMaster ? 'mainMaster' : rec.type === RT.Slide ? 'titleMaster' : undefined;
    if (!kind) continue;
    out.masters.push(readSlideContainer(rec, kind, m.persistId, m.slideId, []));
  }
  for (const s of slideRefs) {
    const rec = recAtPersist(doc, persist, s.persistId);
    if (!rec || rec.type !== RT.Slide) continue;
    out.slides.push(readSlideContainer(rec, 'slide', s.persistId, s.slideId, s.texts));
  }
  for (const n of notesRefs) {
    const rec = recAtPersist(doc, persist, n.persistId);
    if (rec && rec.type === RT.Notes) out.notes.push(readSlideContainer(rec, 'notes', n.persistId, n.slideId, n.texts));
  }
  if (notesMasterPersist) {
    const rec = recAtPersist(doc, persist, notesMasterPersist);
    if (rec && rec.type === RT.Notes) out.notesMaster = readSlideContainer(rec, 'notes', notesMasterPersist, 0, []);
  }
  return out;
}

/** Cadeia de UserEditAtoms da mais recente para a mais antiga. */
function collectUserEdits(doc: ByteReader, currentEdit: number | undefined): Rec[] {
  const out: Rec[] = [];
  const seen = new Set<number>();
  let off = currentEdit;
  // sem "Current User" válido: usa o último UserEditAtom de nível superior
  if (off === undefined || !isUserEdit(doc, off)) off = lastTopLevelUserEdit(doc);
  while (off !== undefined && off > 0 && !seen.has(off) && isUserEdit(doc, off)) {
    seen.add(off);
    const ue = readRec(doc, off)!;
    out.push(ue);
    off = doc.u32(ue.start + 8);
  }
  return out;
}

function isUserEdit(doc: ByteReader, off: number): boolean {
  const r = readRec(doc, off);
  return !!r && r.type === RT.UserEditAtom && r.len >= 28;
}

function lastTopLevelUserEdit(doc: ByteReader): number | undefined {
  let last: number | undefined;
  for (const r of recsIn(doc, 0, doc.length)) if (r.type === RT.UserEditAtom) last = r.hdr;
  return last;
}

/** persistId → offset, com edições mais novas sobrepondo as antigas. */
function buildPersistDirectory(doc: ByteReader, edits: Rec[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const ue of [...edits].reverse()) {
    const pd = readRec(doc, doc.u32(ue.start + 12));
    if (!pd || pd.type !== RT.PersistDirectoryAtom) continue;
    let o = pd.start;
    while (o + 4 <= pd.end) {
      const v = doc.u32(o);
      const id = v & 0xfffff;
      const n = v >>> 20;
      for (let k = 0; k < n && o + 8 + k * 4 <= pd.end; k++) map.set(id + k, doc.u32(o + 4 + k * 4));
      o += 4 + n * 4;
    }
  }
  return map;
}

function recAtPersist(doc: ByteReader, persist: Map<number, number>, id: number): Rec | undefined {
  const off = persist.get(id);
  return off === undefined ? undefined : readRec(doc, off);
}

/** Environment: fontes + padrões de texto do documento. */
function readEnvironment(env: Rec, out: PptDocument): void {
  for (const c of children(env)) {
    if (c.type === RT.FontCollection) {
      for (const f of children(c)) {
        if (f.type !== RT.FontEntityAtom) continue;
        let name = utf16(f.r, f.start, f.start + 64);
        const z = name.indexOf('\0');
        if (z >= 0) name = name.slice(0, z);
        out.fonts[f.inst] = { name, charset: f.r.u8(f.start + 64), pitchFamily: f.r.u8(f.start + 67) };
      }
    } else if (c.type === RT.TextSpecialInfoDefaultAtom) {
      // TextSIException: máscara + spellInfo (bit 0) + lid (bit 1)
      const masks = c.r.u32(c.start);
      if (masks & 0x2) out.docLcid = c.r.u16(c.start + 4 + (masks & 0x1 ? 2 : 0));
    } else if (c.type === RT.TextCharFormatExceptionAtom) out.docCF = readCFExceptionAtom(c);
    else if (c.type === RT.TextParagraphFormatExceptionAtom) out.docPF = readPFExceptionAtom(c);
    else if (c.type === RT.TextMasterStyleAtom) out.docOtherStyle = readTextMasterStyle(c);
  }
}

/** ProgTags → nome → BinaryTagDataBlob (recursivo em List/ProgTags). */
function readProgTags(rec: Rec, into: Map<string, Rec>): void {
  for (const c of children(rec)) {
    if (c.type === RT.ProgTags || c.type === RT.List) readProgTags(c, into);
    else if (c.type === RT.ProgBinaryTag) {
      const kids = children(c);
      const nameRec = kids.find((k) => k.type === RT.CString);
      const blob = kids.find((k) => k.type === RT.BinaryTagDataBlob);
      if (nameRec && blob) into.set(utf16(nameRec.r, nameRec.start, nameRec.end), blob);
    }
  }
}

/**
 * HeadersFootersContainer: HeadersFootersAtom (formatId i16, flags u16:
 * data, data de hoje, data fixa, nº do slide, cabeçalho, rodapé) + CStrings
 * (instância 0 = data fixa, 1 = cabeçalho, 2 = rodapé).
 */
function readHeadersFooters(rec: Rec): PptHeadersFooters {
  const hf: PptHeadersFooters = {
    hasDate: false, hasTodayDate: false, hasUserDate: false, hasSlideNumber: false,
    hasHeader: false, hasFooter: false, formatId: 0,
  };
  for (const k of children(rec)) {
    if (k.type === RT.HeadersFootersAtom) {
      hf.formatId = k.r.i16(k.start);
      const f = k.r.u16(k.start + 2);
      hf.hasDate = (f & 0x1) !== 0; hf.hasTodayDate = (f & 0x2) !== 0; hf.hasUserDate = (f & 0x4) !== 0;
      hf.hasSlideNumber = (f & 0x8) !== 0; hf.hasHeader = (f & 0x10) !== 0; hf.hasFooter = (f & 0x20) !== 0;
    } else if (k.type === RT.CString) {
      const s = utf16(k.r, k.start, k.end);
      if (k.inst === 0) hf.userDate = s;
      else if (k.inst === 1) hf.header = s;
      else if (k.inst === 2) hf.footer = s;
    }
  }
  return hf;
}

/** ColorSchemeAtom → 8 cores 'RRGGBB'. */
function readColorScheme(rec: Rec): string[] {
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const o = rec.start + i * 4;
    out.push([rec.r.u8(o), rec.r.u8(o + 1), rec.r.u8(o + 2)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase());
  }
  return out;
}

/** SlideContainer / MainMasterContainer → PptSlide. */
function readSlideContainer(rec: Rec, kind: PptSlide['kind'], persistId: number, slideId: number, outline: TextBlock[]): PptSlide {
  const s: PptSlide = {
    kind, persistId, slideId, geom: 0, placeholderTypes: [], masterIdRef: 0, flags: 0,
    drawing: {}, outline, binaryTags: new Map(),
  };
  for (const c of children(rec)) {
    switch (c.type) {
      case RT.SlideAtom: {
        const r = c.r, o = c.start;
        s.geom = r.u32(o);
        for (let i = 0; i < 8; i++) s.placeholderTypes.push(r.u8(o + 4 + i));
        s.masterIdRef = r.u32(o + 12);
        s.flags = r.u16(o + 20);
        break;
      }
      case RT.NotesAtom:
        s.slideIdRef = c.r.u32(c.start);
        s.flags = c.r.u16(c.start + 4);
        break;
      case RT.SlideShowSlideInfoAtom: {
        const r = c.r, o = c.start;
        const flags = r.u16(o + 10);
        s.transition = {
          slideTime: r.i32(o), effectDirection: r.u8(o + 8), effectType: r.u8(o + 9), speed: r.u8(o + 12),
          manualAdvance: (flags & 0x1) !== 0, hidden: (flags & 0x4) !== 0, sound: (flags & 0x10) !== 0,
          autoAdvance: (flags & 0x400) !== 0,
        };
        break;
      }
      case RT.Drawing: {
        const dg = child(c, OA.DgContainer);
        if (dg) s.drawing = readDgContainer(dg);
        break;
      }
      case RT.ColorSchemeAtom:
        // instância 1 = esquema do slide/mestre; 6 = lista de esquemas-padrão
        if (c.inst === 1) s.colorScheme = readColorScheme(c);
        break;
      case RT.TextMasterStyleAtom:
        (s.masterStyles ??= new Map()).set(c.inst, readTextMasterStyle(c));
        break;
      case RT.ProgTags: readProgTags(c, s.binaryTags); break;
      case RT.CString:
        if (c.inst === 2 || c.inst === 3) s.name = utf16(c.r, c.start, c.end);
        break;
      case RT.RoundTripTheme12Atom: s.roundTripTheme = recData(c); break;
      case RT.RoundTripAnimationAtom12Atom: s.roundTripTiming = recData(c); break;
      case RT.HeadersFooters: s.headersFooters = readHeadersFooters(c); break;
    }
  }
  return s;
}

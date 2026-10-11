/**
 * DOP ([MS-DOC] 2.7: DopBase + Dop95/97/2000...) → settings.xml. O Word abre
 * um .doc em modo de compatibilidade e, ao salvá-lo como .docx, grava
 * compatibilityMode = 11 (Word 2003) e um w:compat com as opções do Copts60 /
 * Copts80 / Copts — reproduzido aqui bit a bit, na ordem do schema (CT_Compat).
 */
import { ByteReader } from './bytes.js';
import type { DocReader } from './reader.js';
import { attrs, el, XML_DECL, NS } from './xmlw.js';

/** Bit de origem → elemento de w:compat. `inv`: o elemento é o oposto do bit. */
interface CompatFlag { el: string; src: 'c60' | 'c80' | 'c' | 'c2' | 'fe'; bit: number; inv?: boolean }

/** Na ordem de CT_Compat (ECMA-376 Parte 1 §17.15.3 / Parte 4 §14.8.3). */
const COMPAT: CompatFlag[] = [
  { el: 'useSingleBorderforContiguousCells', src: 'c60', bit: 8 },
  { el: 'wpJustification', src: 'c80', bit: 14 },
  { el: 'noTabHangInd', src: 'c60', bit: 0 },
  { el: 'noLeading', src: 'c80', bit: 3 },
  { el: 'spaceForUL', src: 'c80', bit: 4, inv: true },
  { el: 'noColumnBalance', src: 'c60', bit: 5 },
  { el: 'balanceSingleByteDoubleByteWidth', src: 'c60', bit: 15, inv: true },
  { el: 'noExtraLineSpacing', src: 'c80', bit: 11 },
  { el: 'doNotLeaveBackslashAlone', src: 'c60', bit: 12, inv: true },
  { el: 'ulTrailSpace', src: 'c60', bit: 14, inv: true },
  { el: 'doNotExpandShiftReturn', src: 'c60', bit: 13, inv: true },
  { el: 'spacingInWholePoints', src: 'c80', bit: 1 },
  { el: 'lineWrapLikeWord6', src: 'c80', bit: 9 },
  { el: 'printBodyTextBeforeHeader', src: 'c80', bit: 2 },
  { el: 'printColBlack', src: 'c60', bit: 4 },
  { el: 'wpSpaceWidth', src: 'c80', bit: 13 },
  { el: 'showBreaksInFrames', src: 'c60', bit: 10 },
  { el: 'subFontBySize', src: 'c80', bit: 8 },
  { el: 'suppressBottomSpacing', src: 'c80', bit: 12 },
  { el: 'suppressTopSpacing', src: 'c60', bit: 7 },
  { el: 'suppressSpacingAtTopOfPage', src: 'c80', bit: 0 },
  { el: 'suppressTopSpacingWP', src: 'c80', bit: 6 },
  { el: 'suppressSpBfAfterPgBrk', src: 'c60', bit: 2 },
  { el: 'swapBordersFacingPages', src: 'c60', bit: 11 },
  { el: 'convMailMergeEsc', src: 'c60', bit: 6 },
  { el: 'truncateFontHeightsLikeWP6', src: 'c80', bit: 7 },
  { el: 'mwSmallCaps', src: 'c80', bit: 5 },
  { el: 'usePrinterMetrics', src: 'c80', bit: 15 },
  { el: 'doNotSuppressParagraphBorders', src: 'c80', bit: 10 },
  { el: 'wrapTrailSpaces', src: 'c60', bit: 3 },
  { el: 'footnoteLayoutLikeWW8', src: 'c', bit: 1 },
  { el: 'shapeLayoutLikeWW8', src: 'c', bit: 0 },
  { el: 'alignTablesRowByRow', src: 'c', bit: 6 },
  { el: 'forgetLastTabAlignment', src: 'c', bit: 4 },
  { el: 'adjustLineHeightInTable', src: 'c', bit: 3, inv: true },
  { el: 'autoSpaceLikeWord95', src: 'c', bit: 5 },
  { el: 'noSpaceRaiseLower', src: 'c60', bit: 1 },
  { el: 'doNotUseHTMLParagraphAutoSpacing', src: 'c', bit: 2 },
  { el: 'layoutRawTableWidth', src: 'c', bit: 7 },
  { el: 'layoutTableRowsApart', src: 'c', bit: 8 },
  { el: 'useWord97LineBreakRules', src: 'c', bit: 9 },
  { el: 'doNotBreakWrappedTables', src: 'c', bit: 10 },
  { el: 'doNotSnapToGridInCell', src: 'c', bit: 11 },
  { el: 'selectFldWithFirstOrLastChar', src: 'c', bit: 12 },
  { el: 'applyBreakingRules', src: 'c', bit: 13 },
  { el: 'doNotWrapTextWithPunct', src: 'c', bit: 14 },
  { el: 'doNotUseEastAsianBreakRules', src: 'c', bit: 15 },
  { el: 'useWord2002TableStyleRules', src: 'c', bit: 16 },
  { el: 'growAutofit', src: 'c', bit: 17 },
  { el: 'useFELayout', src: 'fe', bit: 0 },
  { el: 'useNormalStyleForList', src: 'c', bit: 18 },
  { el: 'doNotUseIndentAsNumberingTabStop', src: 'c', bit: 19 },
  { el: 'useAltKinsokuLineBreakRules', src: 'c', bit: 20 },
  { el: 'allowSpaceOfSameStyleInTable', src: 'c', bit: 21 },
  { el: 'doNotSuppressIndentation', src: 'c', bit: 22 },
  { el: 'doNotAutofitConstrainedTables', src: 'c', bit: 23 },
  { el: 'autofitToFirstFixedWidthCell', src: 'c', bit: 24 },
  { el: 'underlineTabInNumList', src: 'c', bit: 25 },
  { el: 'displayHangulFixedWidth', src: 'c', bit: 26 },
  { el: 'splitPgBreakAndParaMark', src: 'c', bit: 27 },
  { el: 'doNotVertAlignCellWithSp', src: 'c', bit: 28 },
  { el: 'doNotBreakConstrainedForcedTable', src: 'c', bit: 29 },
  { el: 'doNotVertAlignInTxbx', src: 'c', bit: 30 },
  { el: 'useAnsiKerningPairs', src: 'c', bit: 31 },
  { el: 'cachedColBalance', src: 'c2', bit: 0 },
];

export interface Dop {
  facingPages: boolean;
  mirrorMargins: boolean;
  dxaTab: number;
  dxaHotZ: number;
  cConsecHypLim: number;
  autoHyphen: boolean;
  hyphCapitals: boolean;
  revMarking: boolean;
  fpc: number;
  rncFtn: number;
  nFtn: number;
  rncEdn: number;
  nEdn: number;
  epc: number;
  zoom: number;
  copts60: number;
  copts80hi: number;
  copts?: number;
  copts2?: number;
  /** Proteção: DopBase.fProtEnabled / fLockAtn / fLockRev e Dop2003. */
  protForms: boolean;
  lockAtn: boolean;
  lockRev: boolean;
  /** Dop2003: fTreatLockAtnAsReadOnly, fStyleLock, fEnforceDocProt, iDocProtCur. */
  lockAtnReadOnly: boolean;
  styleLock: boolean;
  enforceDocProt: boolean;
  docProtCur: number;
  /** DopBase (54): fPrintFormData, fSaveFormData, fShadeFormData, fIncludeSubdocsInStats. */
  printFormData: boolean;
  saveFormData: boolean;
  shadeFormData: boolean;
  includeSubdocsInStats: boolean;
  /** Dop97 (410): fSnapBorder, fIncludeHeader, fIncludeFooter (bordas de página). */
  snapBorder: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  /** DopTypography (Dop97 @90): fKerningPunct, iJustification. */
  kerningPunct: boolean;
  justification: number;
  /** DOGRID (Dop97 @400): grade de desenho. */
  grid?: { xa: number; ya: number; dxa: number; dya: number; dyDisplay: number; dxDisplay: number; followMargins: boolean };
}

export function readDop(bytes: Uint8Array, nFib = 0x112): Dop {
  const r = new ByteReader(bytes);
  const b0 = r.u8(0);
  const f32 = r.u32(4);
  const dop: Dop = {
    facingPages: (b0 & 1) !== 0,
    fpc: (b0 >> 5) & 3,
    rncFtn: r.u16(2) & 3,
    nFtn: r.u16(2) >> 2,
    mirrorMargins: (f32 & (1 << 21)) !== 0,
    autoHyphen: (f32 & (1 << 12)) !== 0,
    hyphCapitals: (f32 & (1 << 11)) !== 0,
    revMarking: (f32 & (1 << 15)) !== 0,
    copts60: r.u16(8),
    dxaTab: r.u16(10) || 720,
    dxaHotZ: r.u16(14),
    cConsecHypLim: r.u16(16),
    rncEdn: r.u16(52) & 3,
    nEdn: r.u16(52) >> 2,
    epc: r.u16(54) & 3,
    zoom: (r.u16(82) >> 3) & 0x1ff,
    copts80hi: bytes.length >= 88 ? r.u16(86) : 0,
    protForms: (f32 & (1 << 25)) !== 0,
    lockAtn: (f32 & (1 << 20)) !== 0,
    lockRev: (f32 & (1 << 30)) !== 0,
    // Dop2003 (depois dos 594 bytes do Dop2002): flags A..M em 594, O..T em 598
    lockAtnReadOnly: bytes.length >= 600 && (r.u16(594) & 1) !== 0,
    styleLock: bytes.length >= 600 && (r.u16(594) & 2) !== 0,
    enforceDocProt: bytes.length >= 600 && (r.u16(598) & 8) !== 0,
    docProtCur: bytes.length >= 600 ? (r.u16(598) >> 4) & 7 : 7,
    printFormData: (r.u16(54) & 0x400) !== 0,
    saveFormData: (r.u16(54) & 0x800) !== 0,
    shadeFormData: (r.u16(54) & 0x1000) !== 0,
    includeSubdocsInStats: (r.u16(54) & 0x8000) !== 0,
    snapBorder: bytes.length >= 412 && (r.u16(410) & 0x800) !== 0,
    includeHeader: bytes.length < 412 || (r.u16(410) & 0x1000) !== 0,
    includeFooter: bytes.length < 412 || (r.u16(410) & 0x2000) !== 0,
    kerningPunct: bytes.length >= 92 && (r.u16(90) & 1) !== 0,
    justification: bytes.length >= 92 ? (r.u16(90) >> 1) & 3 : 0,
  };
  if (bytes.length >= 410) {
    const g = r.u16(408);
    dop.grid = { xa: r.u16(400), ya: r.u16(402), dxa: r.u16(404), dya: r.u16(406), dyDisplay: g & 0x7f, dxDisplay: (g >> 8) & 0x7f, followMargins: (g & 0x8000) !== 0 };
  }
  // Dop2000+: Copts (32 bytes) em 508 = copts80 repetido + flags (512) + fCachedColBalance (516)
  // (os flags do Dop2000 antes dele ocupam 32 bits: 504-507).
  if (bytes.length >= 520) {
    dop.copts = r.u32(512);
    dop.copts2 = r.u32(516);
  }
  // Documento do Word 2000/97: o Word liga as emulações dos recursos posteriores
  // (bits K..f do Copts, menos fApplyBreakingRules) — medido no Word (nFib 0xD9)
  if (nFib <= 0xd9) dop.copts = (dop.copts ?? 0) | 0xffffdc00;
  // o Word sempre grava w:cachedColBalance ao salvar um .doc como .docx
  dop.copts2 = (dop.copts2 ?? 0) | 1;
  return dop;
}

/**
 * Proteção do documento (medido contra o .docx do Word): os flags
 * antigos do DopBase (fProtEnabled/fLockAtn/fLockRev) dizem que a proteção está
 * IMPOSTA; sem eles, fEnforceDocProt + iDocProtCur do Dop2003 dão o tipo com
 * enforcement="0". O hash da senha não é convertível (o Word gera outro).
 */
function protectionXml(dop: Dop): string {
  let edit: string | undefined;
  let enforced = true;
  if (dop.lockRev) edit = 'trackedChanges';
  else if (dop.lockAtn) edit = dop.lockAtnReadOnly ? 'readOnly' : 'comments';
  else if (dop.protForms) edit = 'forms';
  else if (dop.enforceDocProt) {
    edit = ['trackedChanges', 'comments', 'forms', 'readOnly'][dop.docProtCur];
    enforced = false;
  }
  if (!edit && !dop.styleLock) return '';
  return el('w:documentProtection', {
    'w:edit': edit,
    'w:formatting': dop.styleLock ? '1' : undefined,
    'w:enforcement': edit ? (enforced ? '1' : '0') : '0',
  });
}

function compatXml(dop: Dop, feLayout: boolean): string {
  let x = '';
  for (const f of COMPAT) {
    let on: boolean;
    if (f.src === 'fe') on = feLayout;
    else if (f.src === 'c60') on = (dop.copts60 & (1 << f.bit)) !== 0;
    else if (f.src === 'c80') on = (dop.copts80hi & (1 << f.bit)) !== 0;
    else if (f.src === 'c') { if (dop.copts === undefined) continue; on = ((dop.copts >>> f.bit) & 1) !== 0; }
    else { if (dop.copts2 === undefined) continue; on = ((dop.copts2 >>> f.bit) & 1) !== 0; }
    if (f.inv) on = !on;
    if (on) x += `<w:${f.el}/>`;
  }
  // .doc abre no modo de compatibilidade do Word 2003
  x += el('w:compatSetting', { 'w:name': 'compatibilityMode', 'w:uri': 'http://schemas.microsoft.com/office/word', 'w:val': 11 });
  return `<w:compat>${x}</w:compat>`;
}

export function buildSettings(r: DocReader, o: { footnotes: boolean; endnotes: boolean }): string {
  const dop = readDop(r.dop, r.fib.nFib);
  // useFELayout: o Word liga quando a fonte padrão do Leste Asiático é de um charset CJK
  const fe = r.fonts[r.stsh.stshif.ftcFE];
  const feLayout = !!fe && [128, 129, 130, 134, 136].includes(fe.charset);
  let x = '';
  if (dop.zoom >= 10 && dop.zoom <= 500) x += el('w:zoom', { 'w:percent': dop.zoom });
  if (dop.printFormData) x += '<w:printFormsData/>';
  if (dop.saveFormData) x += '<w:saveFormsData/>';
  if (dop.mirrorMargins) x += '<w:mirrorMargins/>';
  if (dop.snapBorder) x += '<w:alignBordersAndEdges/>';
  if (!dop.includeHeader) x += '<w:bordersDoNotSurroundHeader/>';
  if (!dop.includeFooter) x += '<w:bordersDoNotSurroundFooter/>';
  if (dop.revMarking) x += '<w:trackRevisions/>';
  x += protectionXml(dop);
  x += el('w:defaultTabStop', { 'w:val': dop.dxaTab });
  if (dop.autoHyphen) x += '<w:autoHyphenation/>';
  if (dop.cConsecHypLim) x += el('w:consecutiveHyphenLimit', { 'w:val': dop.cConsecHypLim });
  // o Word omite a zona padrão (360 = 0,25")
  if (dop.dxaHotZ && dop.dxaHotZ !== 360) x += el('w:hyphenationZone', { 'w:val': dop.dxaHotZ });
  if (!dop.hyphCapitals) x += '<w:doNotHyphenateCaps/>';
  if (dop.facingPages) x += '<w:evenAndOddHeaders/>';
  // grade de desenho: o Word omite os valores padrão (180 twips, exibir a cada 1, origem 1701/1984)
  const g = dop.grid;
  if (g) {
    if (g.dxa !== 180) x += el('w:drawingGridHorizontalSpacing', { 'w:val': g.dxa });
    if (g.dya !== 180) x += el('w:drawingGridVerticalSpacing', { 'w:val': g.dya });
    if (g.dxDisplay !== 1) x += el('w:displayHorizontalDrawingGridEvery', { 'w:val': g.dxDisplay });
    if (g.dyDisplay !== 1) x += el('w:displayVerticalDrawingGridEvery', { 'w:val': g.dyDisplay });
    if (!g.followMargins) {
      x += '<w:doNotUseMarginsForDrawingGridOrigin/>';
      if (g.xa !== 1701) x += el('w:drawingGridHorizontalOrigin', { 'w:val': g.xa });
      if (g.ya !== 1984) x += el('w:drawingGridVerticalOrigin', { 'w:val': g.ya });
    }
  }
  if (!dop.shadeFormData) x += '<w:doNotShadeFormData/>';
  if (!dop.kerningPunct) x += '<w:noPunctuationKerning/>';
  x += el('w:characterSpacingControl', { 'w:val': ['doNotCompress', 'compressPunctuation', 'compressPunctuationAndJapaneseKana'][dop.justification] ?? 'doNotCompress' });
  if (o.footnotes) x += '<w:footnotePr><w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr>';
  if (o.endnotes) x += '<w:endnotePr><w:endnote w:id="-1"/><w:endnote w:id="0"/></w:endnotePr>';
  x += compatXml(dop, feLayout);
  if (!dop.includeSubdocsInStats) x += '<w:doNotIncludeSubdocsInStats/>';
  return `${XML_DECL}<w:settings${attrs({ 'xmlns:w': NS.w, 'xmlns:r': NS.r, 'xmlns:m': NS.m })}>${x}</w:settings>`;
}
